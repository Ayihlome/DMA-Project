import { Platform } from 'react-native'

/** Mirrors the theme tokens in ../src/index.css so both apps look the same. */
export const colors = {
  bgBase: '#FAF9F6',
  bgSurface: '#FFFFFF',
  textPrimary: '#2D3748',
  textSecondary: '#586377',
  borderDefault: '#E2E8F0',
  borderDisabled: '#CBD5E0',
  primary: '#2E4BD8',
  onPrimary: '#FFFFFF',
  accentTint: '#EEF1FE',
  accentPressed: '#2338B0',
  brandPurple: '#7A3FD0',
  brandPurpleTint: '#F4EEFD',
  brandGreen: '#0F5B4A',
  brandGreenTint: '#E7F4EF',
  successTint: '#F0FFF4',
  warningTint: '#FFFAF0',
  errorTint: '#FFF5F5',
  errorDefault: '#C53030',
  warningDefault: '#DD6B20',
  bestValue: '#2F855A',
  secondary: '#0a6c44',
  onSecondary: '#FFFFFF',
  tertiary: '#994200',
  onError: '#FFFFFF',
  surfaceDim: '#d0daf0',
  surfaceContainerLow: '#f0f3ff',
  surfaceContainer: '#e7eeff',
  inverseSurface: '#273141',
  inverseOnSurface: '#ebf1ff',
  scrim: 'rgba(18,28,44,0.4)',
}

/** Brand gradient (blue -> purple -> dark green), same stops as `bg-brand-gradient`. */
export const gradient = {
  colors: [colors.primary, colors.brandPurple, colors.brandGreen] as const,
  locations: [0, 0.55, 1] as const,
}

export const space = { '2xs': 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32 }
export const radius = { sm: 6, md: 8, lg: 8, xl: 12, '2xl': 16, full: 9999 }
export const TAP = 48

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
}

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.56 },
  h1: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 26, letterSpacing: -0.22 },
  h2: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 22, letterSpacing: -0.09 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18 },
  labelBold: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  captionMedium: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
}

const shadowOf = (y: number, blur: number, opacity: number, elevation: number) =>
  Platform.select({
    android: { elevation },
    default: { shadowColor: '#2D3748', shadowOffset: { width: 0, height: y }, shadowOpacity: opacity, shadowRadius: blur },
  })

export const shadow = {
  sm: shadowOf(1, 3, 0.08, 2),
  float: shadowOf(8, 16, 0.14, 8),
  barUp: Platform.select({
    android: { elevation: 12 },
    default: { shadowColor: '#2D3748', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 12 },
  }),
}
