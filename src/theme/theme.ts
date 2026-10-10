import { StyleSheet } from 'react-native'

export const colors = {
  bgBase: '#FAF9F6',
  bgSurface: '#FFFFFF',
  textPrimary: '#2D3748',
  textSecondary: '#718096',
  borderDefault: '#E2E8F0',
  borderDisabled: '#CBD5E0',
  accentTint: '#E6FFFA',
  accentPressed: '#2C7A7B',
  successTint: '#F0FFF4',
  warningTint: '#FFFAF0',
  errorTint: '#FFF5F5',
  errorDefault: '#C53030',
  warningDefault: '#DD6B20',
  bestValue: '#2F855A',
  accent: '#319795',
  primary: '#006766',
  onPrimary: '#FFFFFF',
  primaryContainer: '#0a8280',
  onPrimaryContainer: '#f3fffe',
  secondary: '#0a6c44',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#9ff5c1',
  tertiary: '#994200',
  onTertiary: '#FFFFFF',
  error: '#ba1a1a',
  onError: '#FFFFFF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#f0f3ff',
  surfaceContainer: '#e7eeff',
  surfaceContainerHigh: '#dee8ff',
  surfaceContainerHighest: '#d9e3f9',
  onSurface: '#121c2c',
  onSurfaceVariant: '#3e4948',
  inverseOnSurface: '#ebf1ff',
  inverseSurface: '#273141',
  outline: '#6e7978',
  surfaceDim: '#d0daf0',
}

export const spacing = {
  xs2: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
}

export const radius = {
  sm: 8,
  md: 12,
  xl: 16,
  full: 9999,
}

export const type = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.56 },
  h1: { fontSize: 22, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.22 },
  h2: { fontSize: 18, lineHeight: 22, fontWeight: '600' as const, letterSpacing: -0.09 },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  bodyMedium: { fontSize: 16, lineHeight: 22, fontWeight: '500' as const },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '500' as const },
  labelBold: { fontSize: 14, lineHeight: 18, fontWeight: '700' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  captionMedium: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
}

export const shadow = {
  sm: {
    shadowColor: '#2D3748',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#2D3748',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
}

export const card = StyleSheet.create({
  base: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.sm,
  },
})
