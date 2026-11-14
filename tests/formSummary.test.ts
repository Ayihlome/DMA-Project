/**
 * The sentence under the product and ingredient forms: the owner's answers read back in shop
 * words, so a wrong number is obvious before saving. It only says what was typed: no cost is
 * guessed, and with no cost it says nothing about what is kept.
 */
import { describe, expect, it } from 'vitest'
import { formSummary } from '../src/screens/Products/productFormModel'

const R = (n: number) => `R${n.toFixed(2)}`

describe('the product summary', () => {
  it('reads a crate back as a price per loaf, and what is kept', () => {
    expect(formSummary({ name: 'White bread', unit: 'loaf', price: 18, packSize: 10, packName: 'crate', packCost: 140 }, R)).toEqual([
      'You sell White bread at R18.00 a loaf.',
      'You buy it in crates of 10 for R140.00, which is R14.00 a loaf.',
      'You keep about R4.00 a loaf.',
    ])
  })

  it('says one at a time when there is no pack', () => {
    expect(formSummary({ name: 'Vetkoek', unit: 'item', price: 5, packSize: 1, packCost: 3 }, R)).toEqual([
      'You sell Vetkoek at R5.00 an item.',
      'You buy it one item at a time for R3.00.',
      'You keep about R2.00 an item.',
    ])
  })

  it('never guesses a cost: no price paid, nothing about what is kept', () => {
    expect(formSummary({ name: 'Coke can', unit: 'can', price: 13, packSize: 24, packName: 'tray' }, R)).toEqual([
      'You sell Coke can at R13.00 a can.',
      'You buy it in trays of 24.',
      'What you keep shows once you add what you pay.',
    ])
  })

  it('says plainly when an item sells below what it costs', () => {
    const lines = formSummary({ name: 'Milk', unit: 'sachet', price: 12, packSize: 20, packName: 'crate', packCost: 280 }, R)
    expect(lines[2]).toBe('You lose about R2.00 on each sachet.')
  })

  it('waits for a name', () => {
    expect(formSummary({ name: ' ', unit: 'loaf', price: 18, packSize: 10 }, R)).toEqual([])
  })
})

describe('the ingredient summary (nothing is sold on its own)', () => {
  it('reads the pack back as a price per unit', () => {
    expect(formSummary({ name: 'Polony', unit: 'kg', packSize: 1, packCost: 60 }, R)).toEqual([
      'You buy Polony one kg at a time for R60.00.',
    ])
    expect(formSummary({ name: 'Cheese slices', unit: 'slice', packSize: 24, packName: 'pack', packCost: 48 }, R)).toEqual([
      'You buy Cheese slices in packs of 24 for R48.00, which is R2.00 a slice.',
    ])
  })
})
