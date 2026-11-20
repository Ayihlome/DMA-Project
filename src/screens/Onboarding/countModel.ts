/**
 * The count rows, worked out with no React in it.
 */

/**
 * Where a − or + on a count row lands. Until the owner touches the row it steps
 * from what the app thinks is there (never below 0: a shelf can't hold minus
 * three), and after that from what they counted.
 */
export function stepFrom(counted: number | undefined, expected: number, by: number): number {
  const from = counted ?? Math.max(0, expected)
  return Math.max(0, Math.round((from + by) * 1000) / 1000)
}

/**
 * Tapping a row's greyed number: "yes, that's what is there". It counts as the
 * app's number, or 0 for an oversold item, whose shelf can't hold minus three.
 */
export const confirmCount = (expected: number) => Math.max(0, Math.round(expected * 1000) / 1000)
