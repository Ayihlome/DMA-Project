/**
 * The product form's derived fields: what it no longer asks the owner, it works out.
 */
import { describe, expect, it } from 'vitest'
import { autoName, categoryFor, drinkName, unitHint } from '../src/screens/Products/productFormModel'

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

describe('cold drink name from brand and size', () => {
  it('is brand then size', () => {
    expect(drinkName('Coke', '500ml')).toBe('Coke 500ml')
    expect(drinkName(' Fanta ', ' can ')).toBe('Fanta can')
    expect(drinkName('Sprite', '')).toBe('Sprite')
    // No brand yet: nothing to call it
    expect(drinkName('', '2L')).toBe('')
  })

  it('fills an empty name, and keeps following while the name is still the one it filled in', () => {
    expect(autoName('', '', 'Coke', '500ml')).toBe('Coke 500ml')
    expect(autoName('Coke 500ml', 'Coke 500ml', 'Coke', '2L')).toBe('Coke 2L')
  })

  it('never overwrites a name the owner typed', () => {
    expect(autoName('Coca-Cola 330ml', 'Coke can', 'Coke', '500ml')).toBe('Coca-Cola 330ml')
    expect(autoName('My special', 'Coke 500ml', 'Coke', '2L')).toBe('My special')
  })
})

describe('the unit hint', () => {
  it('uses the unit the owner typed', () => {
    expect(unitHint('can')).toBe('One word. It shows as “per can” and “3 cans left”.')
    expect(unitHint('Loaf')).toBe('One word. It shows as “per loaf” and “3 loaves left”.')
    expect(unitHint('kg')).toBe('One word. It shows as “per kg” and “3 kg left”.')
  })

  it('gives an example before anything is typed', () => {
    expect(unitHint('')).toBe('One word, like can or loaf. It shows as “per can” and “3 cans left”.')
  })
})
