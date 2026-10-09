import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import type { Health } from '../data/inventory'
import type { Product } from '../data/types'
import { useStore } from '../data/store'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ------------------------------------------------------------------ Icon */

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
const ICON_SIZE: Record<IconSize, string> = { xs: 'icon-xs', sm: 'icon-sm', md: 'icon-md', lg: 'icon-lg', xl: 'icon-xl' }

export function Icon({ name, size = 'md', filled, className }: { name: string; size?: IconSize; filled?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cx('material-symbols-outlined shrink-0', ICON_SIZE[size], filled && 'icon-filled', className)}>
      {name}
    </span>
  )
}

/* ---------------------------------------------------------------- Button */

type Variant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger' | 'success'
const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-accent-pressed active:bg-accent-pressed shadow-sm',
  brand: 'bg-brand-gradient text-on-primary shadow-float hover:brightness-110 active:brightness-95',
  secondary: 'border border-primary text-primary bg-bg-surface hover:bg-accent-tint',
  ghost: 'text-primary hover:bg-accent-tint',
  danger: 'text-error-default hover:bg-error-tint',
  success: 'bg-secondary text-on-secondary',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: 'md' | 'sm'
  icon?: string
  iconEnd?: string
  block?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconEnd,
  block,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-space-xs rounded-lg font-label-bold text-label-bold whitespace-nowrap transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none',
        size === 'md' ? 'min-h-tap px-space-md' : 'min-h-tap lg:min-h-10 px-space-sm',
        block && 'w-full',
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size="md" />}
      {children}
      {iconEnd && <Icon name={iconEnd} size="md" />}
    </button>
  )
}

export function IconButton({ icon, label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'w-tap h-tap shrink-0 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-container-low transition-colors',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  )
}

/* ------------------------------------------------------------------ Card */

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cx('bg-bg-surface rounded-xl shadow-sm', className)} {...rest}>
      {children}
    </section>
  )
}

/* ---------------------------------------------------------- StatusBadge */

const HEALTH: Record<Health, { label: string; icon: string; soft: string; solid: string }> = {
  setup: { label: 'Recipe missing', icon: 'lock', soft: 'bg-error-tint text-error-default', solid: 'bg-error-default text-on-error' },
  out: { label: 'Out of stock', icon: 'block', soft: 'bg-error-tint text-error-default', solid: 'bg-error-default text-on-error' },
  critical: { label: 'Critical', icon: 'warning', soft: 'bg-error-tint text-error-default', solid: 'bg-error-default text-on-error' },
  low: { label: 'Low', icon: 'flag', soft: 'bg-warning-tint text-tertiary', solid: 'bg-warning-default text-on-primary' },
  healthy: { label: 'Healthy', icon: 'check_circle', soft: 'bg-success-tint text-secondary', solid: 'bg-secondary text-on-secondary' },
}

export const healthLabel = (h: Health) => HEALTH[h].label

/** Icon + text so status never relies on colour alone (NFR7). `solid` for urgent lists (PRD 6.1). */
export function StatusBadge({ health, solid, className }: { health: Health; solid?: boolean; className?: string }) {
  const h = HEALTH[health]
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-caption-medium text-caption-medium whitespace-nowrap',
        solid ? cx(h.solid, 'font-label-bold uppercase tracking-wide') : h.soft,
        className,
      )}
    >
      <Icon name={h.icon} size="xs" />
      {h.label}
    </span>
  )
}

export function Pill({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'error' | 'purple'
  icon?: string
  children: ReactNode
  className?: string
}) {
  const tones = {
    neutral: 'bg-surface-container-low text-text-secondary',
    brand: 'bg-accent-tint text-primary',
    success: 'bg-success-tint text-secondary',
    warning: 'bg-warning-tint text-tertiary',
    error: 'bg-error-tint text-error-default',
    purple: 'bg-brand-purple-tint text-brand-purple',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-caption-medium text-caption-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} size="xs" />}
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ Tabs */

type TabItem<K extends string> = { key: K; label: string; icon?: string; count?: number }

/** WAI-ARIA tabs: arrow keys move between tabs, panels are linked with aria-controls. */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  label,
  idBase,
  className,
}: {
  items: TabItem<K>[]
  value: K
  onChange: (k: K) => void
  label: string
  idBase: string
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : dir ? (i + dir + items.length) % items.length : -1
    if (to < 0) return
    e.preventDefault()
    onChange(items[to].key)
    refs.current[to]?.focus()
  }
  return (
    <div role="tablist" aria-label={label} className={cx('flex p-space-2xs rounded-xl bg-surface-container gap-space-2xs', className)}>
      {items.map((t, i) => {
        const active = t.key === value
        return (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[i] = el
            }}
            id={`${idBase}-tab-${t.key}`}
            role="tab"
            type="button"
            aria-selected={active}
            aria-controls={`${idBase}-panel`}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(t.key)}
            className={cx(
              'flex-1 min-h-tap lg:min-h-10 px-space-sm rounded-lg flex items-center justify-center gap-space-2xs whitespace-nowrap transition-colors',
              active
                ? 'bg-bg-surface text-primary shadow-sm font-label-bold text-label-bold'
                : 'text-text-secondary hover:text-text-primary font-label text-label',
            )}
          >
            {t.icon && <Icon name={t.icon} size="sm" />}
            {t.label}
            {t.count !== undefined && (
              <span
                className={cx(
                  'min-w-5 px-1.5 rounded-full font-caption-medium text-caption-medium',
                  active ? 'bg-accent-tint' : 'bg-surface-container-low',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({
  idBase,
  active,
  children,
  className,
}: {
  idBase: string
  active: string
  children: ReactNode
  className?: string
}) {
  return (
    <div id={`${idBase}-panel`} role="tabpanel" aria-labelledby={`${idBase}-tab-${active}`} className={className}>
      {children}
    </div>
  )
}

/* ----------------------------------------------- Toggle group and chips */

/** Segmented control for options that filter the same content (aria-pressed, not tabs). */
export function ToggleGroup<K extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: { key: K; label: string }[]
  value: K
  onChange: (k: K) => void
  label: string
  className?: string
}) {
  return (
    <div role="group" aria-label={label} className={cx('inline-flex p-space-2xs rounded-lg bg-surface-container-low', className)}>
      {items.map((t) => (
        <button
          key={t.key}
          type="button"
          aria-pressed={value === t.key}
          onClick={() => onChange(t.key)}
          className={cx(
            'min-h-10 px-space-sm rounded-md font-caption-medium text-caption-medium whitespace-nowrap transition-colors',
            value === t.key ? 'bg-bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({
  selected,
  onClick,
  children,
  icon,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  icon?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'shrink-0 min-h-tap lg:min-h-10 px-space-md rounded-full inline-flex items-center gap-space-2xs font-label text-label whitespace-nowrap transition-colors',
        selected ? 'bg-primary text-on-primary font-label-bold' : 'bg-surface-container-low text-text-secondary hover:text-text-primary',
      )}
    >
      {icon && <Icon name={icon} size="sm" />}
      {children}
    </button>
  )
}

/* ---------------------------------------------------------- SearchField */

export function SearchField({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  placeholder?: string
  className?: string
}) {
  return (
    <div
      className={cx(
        'h-tap px-space-sm rounded-lg bg-surface-container-low flex items-center gap-space-xs focus-within:ring-2 focus-within:ring-primary transition-shadow',
        className,
      )}
    >
      <Icon name="search" className="text-text-secondary" />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        className="flex-1 min-w-0 bg-transparent outline-none font-body text-body text-text-primary placeholder:text-text-secondary [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="w-8 h-8 -mr-space-2xs rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary"
        >
          <Icon name="close" size="sm" />
        </button>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- StatTile */

export function StatTile({
  label,
  value,
  sub,
  tone = 'text-text-primary',
  icon,
  iconTone = 'bg-accent-tint text-primary',
  className,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: string
  icon?: string
  iconTone?: string
  className?: string
}) {
  return (
    <div className={cx('bg-bg-surface rounded-xl p-space-md shadow-sm flex flex-col justify-between gap-space-xs min-w-0', className)}>
      <div className="flex items-center justify-between gap-space-xs">
        <span className="font-caption-medium text-caption-medium text-text-secondary truncate">{label}</span>
        {icon && (
          <span className={cx('w-7 h-7 rounded-full flex items-center justify-center', iconTone)}>
            <Icon name={icon} size="sm" />
          </span>
        )}
      </div>
      <div className="min-w-0">
        <span className={cx('font-h1 text-h1 block tracking-tight truncate', tone)}>{value}</span>
        {sub && <span className="font-caption text-caption text-text-secondary block truncate">{sub}</span>}
      </div>
    </div>
  )
}

/** Compact summary figure used inside cards. */
export function Figure({ label, value, tone = 'text-text-primary' }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="rounded-lg bg-surface-container-low px-space-sm py-space-xs flex flex-col min-w-0">
      <span className="font-caption text-caption text-text-secondary truncate">{label}</span>
      <span className={cx('font-label-bold text-label-bold truncate', tone)}>{value}</span>
    </div>
  )
}

/* ------------------------------------------------------------ EmptyState */

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="py-space-xl px-space-md flex flex-col items-center gap-space-xs text-center">
      <span className="w-12 h-12 rounded-full bg-accent-tint text-primary flex items-center justify-center">
        <Icon name={icon} size="lg" />
      </span>
      <span className="font-label-bold text-label-bold text-text-primary">{title}</span>
      {body && <span className="font-caption text-caption text-text-secondary max-w-xs">{body}</span>}
      {action && <div className="pt-space-xs">{action}</div>}
    </div>
  )
}

/* ----------------------------------------------------------------- Modal */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  const id = useId()
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const first = panel.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')
    first?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus()
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-60 flex items-end lg:items-center justify-center p-space-md bg-on-background/40 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-desc` : undefined}
        className="w-full max-w-lg max-h-[85dvh] overflow-y-auto bg-bg-surface rounded-2xl p-space-lg shadow-float flex flex-col gap-space-md"
      >
        <div className="flex items-start justify-between gap-space-md">
          <div className="flex flex-col gap-space-2xs">
            <h2 id={`${id}-title`} className="font-h2 text-h2 text-text-primary">
              {title}
            </h2>
            {description && (
              <p id={`${id}-desc`} className="font-caption text-caption text-text-secondary">
                {description}
              </p>
            )}
          </div>
          <IconButton icon="close" label="Close" onClick={onClose} data-close className="-mr-space-xs -mt-space-xs" />
        </div>
        {children}
        {footer && <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-space-xs pt-space-xs">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: (id: string) => ReactNode
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-space-2xs">
      <label htmlFor={id} className="font-caption-medium text-caption-medium text-text-secondary">
        {label}
      </label>
      {children(id)}
      {error ? (
        <span className="font-caption text-caption text-error-default">{error}</span>
      ) : (
        hint && <span className="font-caption text-caption text-text-secondary">{hint}</span>
      )}
    </div>
  )
}

export const inputClass =
  'h-tap px-space-sm rounded-lg bg-surface-container-low text-text-primary font-body text-body outline-none border border-transparent focus:border-primary focus:bg-bg-surface transition-colors w-full'

/* ---------------------------------------------------------- ProductThumb */

const THUMB = { sm: 'w-10 h-10 rounded-lg', md: 'w-12 h-12 rounded-xl', fill: 'w-full h-full' }

export function ProductThumb({
  product,
  size = 'md',
  className,
  grayscale,
}: {
  product: Product
  size?: keyof typeof THUMB
  className?: string
  grayscale?: boolean
}) {
  const { photos } = useStore()
  const [failed, setFailed] = useState(false)
  const src = photos[product.id] ?? product.image
  return (
    <div className={cx(THUMB[size], 'bg-surface-container-low overflow-hidden flex items-center justify-center shrink-0', className)}>
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className={cx('w-full h-full object-cover', grayscale && 'grayscale')}
        />
      ) : (
        <Icon name={product.icon} size={size === 'sm' ? 'md' : 'lg'} className="text-primary" />
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- Brand */

export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <span
      className={cx(
        'bg-brand-gradient text-on-primary flex items-center justify-center shrink-0 shadow-sm',
        size === 'md' ? 'w-10 h-10 rounded-xl' : 'w-8 h-8 rounded-lg',
      )}
    >
      <Icon name="stacked_line_chart" size={size === 'md' ? 'lg' : 'md'} />
    </span>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx('font-h2 text-h2 tracking-tight text-text-primary', className)}>
      Stock<span className="text-brand-gradient">Evo</span>
    </span>
  )
}

export { cx }
