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
