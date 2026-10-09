import { jsPDF } from 'jspdf'

export type ReportData = {
  store: string
  owner: string
  totalItems: number
  healthyItems: number
  lowItems: number
  criticalItems: number
  categories: { name: string; level: number }[]
  weeks: string[]
  sold: number[]
  restocked: number[]
}

// PDF drawing needs literal RGB values; these mirror the theme tokens in src/index.css.
type RGB = [number, number, number]
const PRIMARY: RGB = [46, 75, 216] // --color-primary
const PURPLE: RGB = [122, 63, 208] // --color-brand-purple
const DARK_GREEN: RGB = [15, 91, 74] // --color-brand-green
const SECONDARY: RGB = [10, 108, 68] // --color-secondary
const TERTIARY: RGB = [221, 107, 32] // --color-warning-default
const ERROR: RGB = [197, 48, 48] // --color-error-default
const TEXT: RGB = [45, 55, 72] // --color-text-primary
const MUTED: RGB = [113, 128, 150] // --color-text-secondary
const BORDER: RGB = [226, 232, 240] // --color-border-default
const TINT: RGB = [238, 241, 254] // --color-accent-tint
const TRACK: RGB = [240, 243, 255] // --color-surface-container-low
const RESTOCK: RGB = PURPLE

const PAGE_W = 210
const M = 16 // page margin (mm)

export function exportInventoryReport(d: ReportData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const now = new Date()
  const dateLabel = now.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
  const fill = (c: RGB) => doc.setFillColor(...c)
  const stroke = (c: RGB) => doc.setDrawColor(...c)
  const color = (c: RGB) => doc.setTextColor(...c)
  const font = (size: number, style: 'normal' | 'bold' = 'normal') => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
  }
  const heading = (label: string, y: number) => {
    font(12, 'bold')
    color(TEXT)
    doc.text(label, M, y)
  }

  // Header band
  // Brand gradient band (blue → purple → dark green), drawn as thin strips.
  const STRIPS = 70
  const lerp = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB
  for (let i = 0; i < STRIPS; i++) {
    const t = i / (STRIPS - 1)
    fill(t < 0.55 ? lerp(PRIMARY, PURPLE, t / 0.55) : lerp(PURPLE, DARK_GREEN, (t - 0.55) / 0.45))
    doc.rect((PAGE_W / STRIPS) * i, 0, PAGE_W / STRIPS + 0.3, 38, 'F')
  }
  color([255, 255, 255])
  font(9, 'bold')
  doc.text('STOCKEVO', M, 13)
  font(20, 'bold')
  doc.text('Inventory Report', M, 24)
  font(10)
  doc.text(`${d.store}  ·  Prepared for ${d.owner}`, M, 31)
  doc.text(dateLabel, PAGE_W - M, 31, { align: 'right' })

  // Summary tiles
  let y = 50
  heading('Stock overview', y)
  y += 5
  const health = Math.round((d.healthyItems / d.totalItems) * 100)
  const tiles: { label: string; value: string; tone: RGB }[] = [
    { label: 'Stock health', value: `${health}%`, tone: PRIMARY },
    { label: 'Total items', value: String(d.totalItems), tone: TEXT },
    { label: 'In stock', value: String(d.healthyItems), tone: SECONDARY },
    { label: 'Low', value: String(d.lowItems), tone: TERTIARY },
    { label: 'Critical', value: String(d.criticalItems), tone: ERROR },
  ]
  const gap = 4
  const tileW = (PAGE_W - M * 2 - gap * (tiles.length - 1)) / tiles.length
  tiles.forEach((t, i) => {
    const x = M + i * (tileW + gap)
    fill(i === 0 ? TINT : [255, 255, 255])
    stroke(BORDER)
    doc.roundedRect(x, y, tileW, 22, 2, 2, 'FD')
    font(8)
    color(MUTED)
    doc.text(t.label, x + 4, y + 7)
    font(16, 'bold')
    color(t.tone)
    doc.text(t.value, x + 4, y + 17)
  })

  // Category levels
  y += 32
  heading('Category levels', y)
  font(8)
  color(MUTED)
  doc.text('% of target stock', PAGE_W - M, y, { align: 'right' })
  y += 7
  const labelW = 32
  const barX = M + labelW
  const barW = PAGE_W - M * 2 - labelW - 14
  d.categories.forEach((c) => {
    const tone = c.level < 15 ? ERROR : c.level < 57 ? TERTIARY : PRIMARY
    font(9)
    color(TEXT)
    doc.text(c.name, M, y + 2.5)
    fill(TRACK)
    doc.roundedRect(barX, y, barW, 3, 1.5, 1.5, 'F')
    fill(tone)
    doc.roundedRect(barX, y, (barW * c.level) / 100, 3, 1.5, 1.5, 'F')
    font(9, 'bold')
    doc.text(`${c.level}%`, PAGE_W - M, y + 2.5, { align: 'right' })
    y += 8
  })

  // Stock movement chart
  y += 6
  heading('Stock movement · last 12 weeks', y)
  const legend: [string, RGB][] = [
    ['Units sold', PRIMARY],
    ['Units restocked', RESTOCK],
  ]
  let lx = PAGE_W - M
  font(8)
  ;[...legend].reverse().forEach(([label, c]) => {
    const w = doc.getTextWidth(label)
    color(MUTED)
    doc.text(label, lx, y, { align: 'right' })
    fill(c)
    doc.circle(lx - w - 3, y - 1, 1.2, 'F')
    lx -= w + 10
  })
  y += 6
  const chartX = M + 10
  const chartW = PAGE_W - M - chartX
  const chartH = 40
  const peak = Math.max(...d.sold, ...d.restocked, 1)
  const pow = 10 ** Math.floor(Math.log10(peak))
  const max = Math.ceil(peak / pow / 2) * 2 * pow
  font(7)
  ;[0, 0.25, 0.5, 0.75, 1]
    .map((f) => Math.round(max * f))
    .forEach((t) => {
      const gy = y + chartH - (t / max) * chartH
      stroke(BORDER)
      doc.setLineWidth(0.2)
      doc.line(chartX, gy, chartX + chartW, gy)
      color(MUTED)
      doc.text(String(t), chartX - 2, gy + 1, { align: 'right' })
    })
  const step = chartW / (d.weeks.length - 1)
  const plot = (values: number[], c: RGB, dashed = false) => {
    stroke(c)
    doc.setLineWidth(0.7)
    doc.setLineDashPattern(dashed ? [1.5, 1] : [], 0)
    values.forEach((v, i) => {
      if (i === 0) return
      const x1 = chartX + (i - 1) * step
      const x2 = chartX + i * step
      const y1 = y + chartH - (values[i - 1] / max) * chartH
      const y2 = y + chartH - (v / max) * chartH
      doc.line(x1, y1, x2, y2)
    })
    doc.setLineDashPattern([], 0)
    fill(c)
    values.forEach((v, i) => doc.circle(chartX + i * step, y + chartH - (v / max) * chartH, 0.8, 'F'))
  }
  plot(d.restocked, RESTOCK, true)
  plot(d.sold, PRIMARY)
  color(MUTED)
  d.weeks.forEach((w, i) => doc.text(w, chartX + i * step, y + chartH + 5, { align: 'center' }))

  // Weekly table
  y += chartH + 12
  heading('Weekly breakdown', y)
  y += 4
  const cols = ['Week', 'Units sold', 'Units restocked', 'Net change']
  const colW = (PAGE_W - M * 2) / cols.length
  fill(TRACK)
  doc.rect(M, y, PAGE_W - M * 2, 7, 'F')
  font(8, 'bold')
  color(TEXT)
  cols.forEach((c, i) => doc.text(c, M + 3 + i * colW, y + 4.8))
  y += 7
  font(8)
  d.weeks.forEach((w, i) => {
    const net = d.restocked[i] - d.sold[i]
    const row = [w, String(d.sold[i]), String(d.restocked[i]), `${net > 0 ? '+' : ''}${net}`]
    row.forEach((cell, j) => {
      color(j === 3 ? (net < 0 ? ERROR : SECONDARY) : TEXT)
      doc.text(cell, M + 3 + j * colW, y + 3.8)
    })
    stroke(BORDER)
    doc.setLineWidth(0.2)
    doc.line(M, y + 5.2, PAGE_W - M, y + 5.2)
    y += 5.2
  })
  const totalSold = d.sold.reduce((a, b) => a + b, 0)
  const totalRestocked = d.restocked.reduce((a, b) => a + b, 0)
  const totalNet = totalRestocked - totalSold
  font(8, 'bold')
  color(TEXT)
  ;['Total', String(totalSold), String(totalRestocked), `${totalNet > 0 ? '+' : ''}${totalNet}`].forEach((cell, j) =>
    doc.text(cell, M + 3 + j * colW, y + 3.8),
  )

  // Footer
  font(7)
  color(MUTED)
  doc.text(`Generated by StockEvo on ${now.toLocaleString('en-ZA')}`, M, 289)
  doc.text('Page 1 of 1', PAGE_W - M, 289, { align: 'right' })

  const slug = d.store
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  doc.save(`${slug}-inventory-report-${now.toISOString().slice(0, 10)}.pdf`)
}
