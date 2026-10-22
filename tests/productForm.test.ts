/**
 * The product form's derived fields: what it no longer asks the owner, it works out.
 */
import { describe, expect, it } from 'vitest'
import { categoryFor } from '../src/screens/Products/productFormModel'

describe('category, derived instead of asked', () => {
  it('follows the Sell group for bread and cold drinks', () => {
    expect(categoryFor(undefined, 'bread')).toBe('bakery')
    expect(categoryFor(undefined, 'colddrink')).toBe('beverages')
    // Moving an item into a group moves its category with it
    expect(categoryFor('pantry', 'colddrink')).toBe('beverages')
  })

  it('keeps what an existing product has when it sits on its own tile', () => {
    expect(categoryFor('dairy', 'none')).toBe('dairy')
    expect(categoryFor('ingredients', 'none')).toBe('ingredients')
    expect(categoryFor('other', 'none')).toBe('other')
  })

  it('gives a new product on its own tile the everyday category, as the form did before', () => {
    expect(categoryFor(undefined, 'none')).toBe('pantry')
  })
})
