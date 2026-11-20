/**
 * Stock that came in with no supplier picked (or "Bought it" on an item with no price yet) must
 * still be saved. Refusing it lost the stock: the next reload put the old count back.
 */
import { describe, expect, it } from 'vitest'
import { createSavePurchaseOrdersUseCase } from '../src/backend/useCases/purchaseOrders'

const delivered = (supplierId: string) => ({
  id: 'PO-1001',
  at: 1,
  supplierId,
  payment: 'Cash',
  status: 'delivered',
  receivedAt: 2,
  lines: [{ productId: 'bubblegum', qty: 24, unitPrice: 0 }],
})

describe('saving orders with no supplier', () => {
  it('saves them, so their stock goes in', async () => {
    const saved: unknown[] = []
    const save = createSavePurchaseOrdersUseCase({ purchaseOrderRepository: { save: async (o: unknown[]) => void saved.push(...o) } })
    expect(await save({ orders: [delivered('')] })).toEqual({ success: true, saved: 1 })
    expect(saved).toHaveLength(1)
  })

  it('still refuses an order with no lines', async () => {
    const save = createSavePurchaseOrdersUseCase({ purchaseOrderRepository: { save: async () => {} } })
    const r = await save({ orders: [{ ...delivered(''), lines: [] }] })
    expect(r.success).toBe(false)
  })
})
