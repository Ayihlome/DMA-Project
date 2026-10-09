import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useStore } from '../data/store'
import { CRITICAL_DAYS, LOW_DAYS, TARGET_DAYS } from '../data/inventory'
import { analyticsOf } from '../data/analytics'
import { longDate } from '../lib/format'
import { useToast } from '../components/Toast'
import { Avatar, SyncStatus } from '../components/AppShell'
import PurchaseHistory from '../components/PurchaseHistory'
import { Button, Card, Field, Icon, Modal, ToggleGroup, cx, inputClass } from '../components/ui'

type Series = 'sold' | 'restocked'

const CHART_W = 640
const CHART_H = 220

function smoothPath(values: number[], max: number) {
  const step = CHART_W / (values.length - 1)
  const pts = values.map((v, i) => [i * step, CHART_H - (v / max) * CHART_H] as const)
  return pts.reduce((d, [x, y], i) => {
    if (i === 0) return `M ${x} ${y}`
    const [px, py] = pts[i - 1]
    const cx2 = (px + x) / 2
    return `${d} C ${cx2} ${py}, ${cx2} ${y}, ${x} ${y}`
  }, '')
}

function niceMax(n: number) {
  const pow = 10 ** Math.floor(Math.log10(Math.max(n, 1)))
  return Math.ceil(n / pow / 2) * 2 * pow
}

/** Shared analytics used on screen and in the PDF (same calculation as the mobile app). */
export function useAnalytics() {
  const { state } = useStore()
  return useMemo(() => analyticsOf(state), [state])
}

function HealthRing({ percent }: { percent: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="relative w-40 h-40" role="img" aria-label={`${percent}% of stock items are healthy`}>
      <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="60%" stopColor="var(--color-brand-purple)" />
            <stop offset="100%" stopColor="var(--color-brand-green)" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r={r} fill="none" strokeWidth="10" className="stroke-accent-tint" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke="url(#ring)"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="font-display text-display text-text-primary">{percent}%</span>
        <span className="font-caption text-caption text-text-secondary">healthy</span>
      </div>
    </div>
  )
}

function MovementChart({ weeks, sold, restocked }: { weeks: string[]; sold: number[]; restocked: number[] }) {
  const [series, setSeries] = useState<Series>('sold')
  const [hover, setHover] = useState<number | null>(null)
  const values = series === 'sold' ? sold : restocked
  const max = niceMax(Math.max(...sold, ...restocked, 1))
  const total = values.reduce((a, b) => a + b, 0)
  const step = CHART_W / (values.length - 1)
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => Math.round(max * f))
  const stroke = series === 'sold' ? 'stroke-primary' : 'stroke-brand-purple'

  return (
    <Card className="p-space-lg flex flex-col gap-space-md lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex flex-col gap-space-2xs">
          <h2 className="font-h2 text-h2 text-text-primary">Stock movement</h2>
          <span className="font-caption text-caption text-text-secondary">
            {total.toLocaleString()} units {series} · last 12 weeks
          </span>
        </div>
        <ToggleGroup
          label="Chart series"
          value={series}
          onChange={setSeries}
          items={[
            { key: 'sold', label: 'Units sold' },
            { key: 'restocked', label: 'Units restocked' },
          ]}
        />
      </div>

      <div className="flex gap-space-xs" aria-hidden="true">
        <div className="flex flex-col justify-between font-caption text-caption text-text-secondary pb-space-lg text-right">
          {ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-space-xs">
          <div className="relative">
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              preserveAspectRatio="none"
              className="w-full h-56 overflow-visible"
              onMouseLeave={() => setHover(null)}
            >
              {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                <line
                  key={f}
                  x1="0"
                  x2={CHART_W}
                  y1={CHART_H * f}
                  y2={CHART_H * f}
                  strokeWidth="1"
                  className="stroke-border-default"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path
                d={`${smoothPath(values, max)} L ${CHART_W} ${CHART_H} L 0 ${CHART_H} Z`}
                className={series === 'sold' ? 'fill-accent-tint' : 'fill-brand-purple-tint'}
                opacity="0.8"
              />
              <path
                d={smoothPath(values, max)}
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                className={stroke}
                vectorEffect="non-scaling-stroke"
              />
              {hover !== null && (
                <line
                  x1={hover * step}
                  x2={hover * step}
                  y1="0"
                  y2={CHART_H}
                  strokeDasharray="4 4"
                  className="stroke-text-secondary"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {values.map((_, i) => (
                <rect
                  key={i}
                  x={i * step - step / 2}
                  y="0"
                  width={step}
                  height={CHART_H}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
              ))}
            </svg>
            {hover !== null && (
              <div
                className="absolute -top-space-xs px-space-xs py-space-2xs rounded-lg bg-inverse-surface text-inverse-on-surface font-caption-medium text-caption-medium shadow-float pointer-events-none -translate-x-1/2 -translate-y-full whitespace-nowrap"
                style={{ left: `${(hover / (values.length - 1)) * 100}%` }}
              >
                Week of {weeks[hover]}: {values[hover]} units
              </div>
            )}
          </div>
          <div className="flex justify-between font-caption text-caption text-text-secondary">
            {weeks.map((w, i) => (
              <span key={w} className={cx(i % 2 === 1 && 'hidden sm:inline')}>
                {w}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Text alternative for assistive technology */}
      <table className="sr-only">
        <caption>Units sold and restocked per week</caption>
        <thead>
          <tr>
            <th>Week of</th>
            <th>Units sold</th>
            <th>Units restocked</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w, i) => (
            <tr key={w}>
              <td>{w}</td>
              <td>{sold[i]}</td>
              <td>{restocked[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function EditProfile({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, updateProfile } = useStore()
  const toast = useToast()
  const [owner, setOwner] = useState(state.profile.ownerName)
  const [store, setStore] = useState(state.profile.storeName)
  const [tried, setTried] = useState(false)
  useEffect(() => {
    if (open) {
      setOwner(state.profile.ownerName)
      setStore(state.profile.storeName)
      setTried(false)
    }
  }, [open, state.profile])
  const save = () => {
    setTried(true)
    if (!owner.trim() || !store.trim()) return
    updateProfile({ ownerName: owner.trim(), storeName: store.trim() })
    toast('Profile updated.')
    onClose()
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit profile"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button icon="check" onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-space-sm"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Field label="Your name" error={tried && !owner.trim() ? 'Enter your name.' : undefined}>
          {(id) => <input id={id} className={inputClass} value={owner} onChange={(e) => setOwner(e.target.value)} autoComplete="name" />}
        </Field>
        <Field label="Shop name" error={tried && !store.trim() ? 'Enter your shop name.' : undefined}>
          {(id) => (
            <input id={id} className={inputClass} value={store} onChange={(e) => setStore(e.target.value)} autoComplete="organization" />
          )}
        </Field>
        <button type="submit" className="sr-only">
          Save
        </button>
      </form>
    </Modal>
  )
}

export default function Profile() {
  const { state } = useStore()
  const toast = useToast()
  const a = useAnalytics()
  const [params] = useSearchParams()
  const [editing, setEditing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const historyRef = useRef<HTMLDivElement>(null)
  const initialHistory = params.get('history') === 'sales' ? 'sales' : 'purchases'

  useEffect(() => {
    if (params.get('history')) historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [params])

  async function exportPdf() {
    setExporting(true)
    try {
      // Loaded on demand so jsPDF (~130 KB gzipped) stays out of the main bundle.
      const { exportInventoryReport } = await import('../lib/exportReport')
      exportInventoryReport({
        store: state.profile.storeName,
        owner: state.profile.ownerName,
        totalItems: a.total,
        healthyItems: a.healthy,
        lowItems: a.low,
        criticalItems: a.critical,
        categories: a.categories,
        weeks: a.weeks,
        sold: a.sold,
        restocked: a.restocked,
      })
      toast('Report downloaded.')
    } catch {
      toast("The report couldn't be created. Check your connection and try again.", 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="w-full lg:max-w-7xl lg:mx-auto p-space-md lg:px-space-xl lg:py-space-lg grid grid-cols-1 gap-space-md lg:grid-cols-[15rem_minmax(0,1fr)_minmax(0,1fr)] lg:gap-space-lg [&>*]:min-w-0">
      <h1 className="sr-only">Profile and analytics</h1>

      {/* Profile card */}
      <Card className="p-space-lg flex flex-col gap-space-lg lg:row-span-2">
        <div className="flex lg:flex-col items-center gap-space-md lg:text-center">
          <Avatar name={state.profile.ownerName} size="lg" />
          <div className="flex flex-col gap-space-2xs min-w-0 lg:items-center">
            <span className="font-h2 text-h2 text-text-primary truncate">{state.profile.ownerName}</span>
            <span className="font-caption text-caption text-text-secondary truncate">
              {state.profile.role} · {state.profile.storeName}
            </span>
            <SyncStatus />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-1 gap-space-xs">
          <Button variant="secondary" icon="edit" onClick={() => setEditing(true)}>
            Edit profile
          </Button>
          <Button
            icon={exporting ? 'progress_activity' : 'picture_as_pdf'}
            onClick={exportPdf}
            disabled={exporting}
            aria-busy={exporting}
            className={exporting ? '[&>span:first-child]:animate-spin' : undefined}
          >
            {exporting ? 'Preparing…' : 'Export PDF'}
          </Button>
        </div>

        <div className="mt-auto pt-space-md border-t border-border-default flex flex-col gap-space-2xs">
          <span className="font-caption text-caption text-text-secondary">Member since</span>
          <span className="font-label-bold text-label-bold text-text-primary">{longDate(state.profile.memberSince)}</span>
        </div>
      </Card>

      {/* Stock health */}
      <Card className="p-space-lg flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <h2 className="font-h2 text-h2 text-text-primary">Stock health</h2>
          <span className="font-caption text-caption text-text-secondary">{a.total} stock items</span>
        </div>
        <div className="flex justify-center py-space-xs">
          <HealthRing percent={a.percent} />
        </div>
        <dl className="grid grid-cols-3 border-t border-border-default pt-space-md text-center">
          {[
            { label: 'Healthy', value: a.healthy, tone: 'text-secondary', icon: 'check_circle' },
            { label: 'Low', value: a.low, tone: 'text-tertiary', icon: 'flag' },
            { label: 'Critical', value: a.critical, tone: 'text-error-default', icon: 'warning' },
          ].map((s, i) => (
            <div key={s.label} className={cx('flex flex-col items-center gap-space-2xs', i === 1 && 'border-x border-border-default')}>
              <dt className="font-caption text-caption text-text-secondary inline-flex items-center gap-0.5">
                <Icon name={s.icon} size="xs" className={s.tone} />
                {s.label}
              </dt>
              <dd className={cx('font-h2 text-h2', s.tone)}>{s.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Category levels */}
      <Card className="p-space-lg flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <h2 className="font-h2 text-h2 text-text-primary">Category levels</h2>
          <span className="font-caption text-caption text-text-secondary">% of {TARGET_DAYS}-day target</span>
        </div>
        <ul className="flex flex-col gap-space-md">
          {a.categories.map(({ name, icon, level }) => {
            const tone =
              level < (CRITICAL_DAYS / TARGET_DAYS) * 100
                ? 'bg-error-default'
                : level < (LOW_DAYS / TARGET_DAYS) * 100
                  ? 'bg-warning-default'
                  : 'bg-brand-gradient'
            return (
              <li key={name} className="flex flex-col gap-space-2xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-space-xs font-label text-label text-text-primary">
                    <Icon name={icon} size="sm" className="text-text-secondary" />
                    {name}
                  </span>
                  <span className="font-label-bold text-label-bold text-text-primary">{level}%</span>
                </div>
                <div
                  className="h-1.5 rounded-full bg-surface-container-low overflow-hidden"
                  role="meter"
                  aria-label={`${name} stock level`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={level}
                >
                  <div className={cx('h-full rounded-full', tone)} style={{ width: `${level}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      <MovementChart weeks={a.weeks} sold={a.sold} restocked={a.restocked} />

      <div ref={historyRef} className="lg:col-span-3 scroll-mt-20">
        <PurchaseHistory initialView={initialHistory} />
      </div>

      <EditProfile open={editing} onClose={() => setEditing(false)} />
    </div>
  )
}
