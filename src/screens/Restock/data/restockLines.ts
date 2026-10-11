import { round2 } from '../../shared/productPresentation'

/** A row of the Restock screen. */
export interface RestockLine {
  id: string
  name: string
  qty: number
  unit: string
  packs: string
  level: 'out-soon' | 'low'
  suppliers: { id: string; name: string; unitPrice: number }[] // cheapest first
  why: string
}

/** One item of generateRestockPlan's answer (see the contract in useCases/generateRestockPlan.js). */
export type PlanRecommendation = {
  product: { productId: string; name: string; unit: string; packSize: number; stock: number }
  quantity: number
  options: { supplierId: string; supplierName: string; unitPrice: number }[] // cheapest first
  daysOfStockRemaining: number | null
  salesVelocity: number
}

const OUT_SOON_DAYS = 1

/** Turns the plan into the rows the Restock screen draws. */
export function toRestockItems(recommendations: PlanRecommendation[]): RestockLine[] {
  return recommendations.map(rec => {
    const { product, options } = rec
    const days = rec.daysOfStockRemaining
    const out = product.stock <= 0 || (days != null && days <= OUT_SOON_DAYS)
    const packs = Math.ceil(rec.quantity / (product.packSize || 1) - 1e-9)

    const sentences = [
      product.stock <= 0
        ? 'None left.'
        : `${round2(product.stock)} ${product.unit} left${
            rec.salesVelocity > 0
              ? ` and you sell about ${round2(rec.salesVelocity)} a day, so about ${days != null ? (days < 1 ? 'a day or less' : `${Math.round(days)} days`) : 'a week'} of stock`
              : ''
          }.`,
    ]
    if (options.length > 1) {
      sentences.push(
        `${options[0].supplierName} is R${(options[1].unitPrice - options[0].unitPrice).toFixed(2)} cheaper per ${product.unit} than ${options[1].supplierName}.`,
      )
    }

    return {
      id: product.productId,
      name: product.name,
      qty: rec.quantity,
      unit: product.unit,
      packs: `${packs} ${packs === 1 ? 'pack' : 'packs'}`,
      level: out ? 'out-soon' : 'low',
      suppliers: options.map(o => ({ id: o.supplierId, name: o.supplierName, unitPrice: o.unitPrice })),
      why: sentences.join(' '),
    }
  })
}
