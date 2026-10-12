/**
 * The two worklets every drag interaction needs. Both must stay worklets —
 * they're called from the UI runtime inside gesture handlers.
 */

/**
 * Where a flick would come to rest if it kept decelerating. Apple's
 * exponential-decay form, not the v^2/2a from physics class.
 *
 * Using this means a fast short swipe commits and a slow long one doesn't,
 * which is what makes a sheet feel light rather than heavy.
 */
export function project(velocity: number, decelerationRate = 0.998) {
  'worklet'
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate)
}

/**
 * The further past an edge, the less the element follows. Things in the real
 * world slow down before stopping; they don't hit an invisible wall.
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  'worklet'
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
}
