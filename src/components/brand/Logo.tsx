import React from 'react'
import Svg, { Path } from 'react-native-svg'
import { colors } from '../../theme/tokens'
import { LOGO_PATHS, LOGO_STROKE_WIDTH, LOGO_VIEWBOX } from './logoPaths'

/**
 * The stock evo mark. Geometry lives in ./logoPaths so this and the animated
 * splash always draw the same thing.
 */
export default function Logo({
  size = 84,
  stroke = colors.ink,
  strokeWidth = LOGO_STROKE_WIDTH,
}: {
  size?: number
  /** Mark colour. Ink on the yellow auth header, yellow on the black POS header. */
  stroke?: string
  strokeWidth?: number
}) {
  return (
    <Svg width={size} height={size} viewBox={LOGO_VIEWBOX} fill="none">
      {LOGO_PATHS.map((p) => (
        <Path
          key={p.label}
          d={p.d}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </Svg>
  )
}
