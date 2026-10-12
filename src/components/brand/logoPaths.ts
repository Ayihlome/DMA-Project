/**
 * The one source of truth for the stock evo mark — an outline isometric cube
 * with a tape strip across the lid, drawn in a 0 0 100 100 box.
 *
 * Both the static <Logo> and the animated splash read from here, so the two
 * can't drift into being different drawings. `length` is each path's stroke
 * length in design units, which the splash needs for the draw-on effect
 * (strokeDashoffset walks from `length` down to 0).
 */
export const LOGO_VIEWBOX = '0 0 100 100'
export const LOGO_STROKE_WIDTH = 7

export type LogoPath = { d: string; length: number; label: string }

export const LOGO_PATHS: LogoPath[] = [
  // Outer silhouette: 44.0 + 52 + 44.4 + 44.4 + 52 + 44.0
  { label: 'cube', d: 'M50 7 L91 23 L91 75 L50 92 L9 75 L9 23 Z', length: 282 },
  // Lid — the two top faces meeting at the front corner: 44.0 + 44.0
  { label: 'lid', d: 'M9 23 L50 39 L91 23', length: 88 },
  // Vertical front edge
  { label: 'edge', d: 'M50 39 L50 92', length: 53 },
  // Tape strip across the lid: 44.0 + 14
  { label: 'tape', d: 'M30 15 L71 31 L71 45', length: 58 },
]
