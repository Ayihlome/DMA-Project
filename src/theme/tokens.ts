import { Platform, type TextStyle } from 'react-native'
import { cubicBezier } from 'react-native-reanimated'

/**
 * Tokens from STOCK_EVO_DESIGN.md (repo root). Yellow brand, black ink.
 *
 * Deliberately separate from ./theme.ts: that one styles Dashboard, Restock,
 * Supply, Products and Profile, which this redesign does not cover. Screens
 * that have been restyled import from here; the rest keep importing ./theme.
 */
export const colors = {
  /** Yellow — auth header, accents, + buttons, active nav */
  brand: '#FFC20E',
  /** Selected payment option, focus ring */
  brandSoft: '#FFF3CC',
  /** Text, primary buttons, sidebar/header on POS */
  ink: '#111111',
  surface: '#FFFFFF',
  /** Input background, segmented control track */
  field: '#F2F2EE',
  /** POS screen background */
  page: '#F4F4F1',
  /** Card borders, dividers */
  line: '#E6E6E1',
  /** Secondary text, placeholders */
  muted: '#66665F',
  /**
   * Muted text on the v2 screens (Home, Prices, Restock, Profile), a shade
   * darker per STOCK_EVO_SCREENS_V2. Separate so the auth screens, which use
   * `muted`, stay exactly as signed off.
   */
  quiet: '#5C5C56',
  /** Low-stock badge */
  danger: '#B42318',
  /** Synced dot */
  success: '#157F3D',
  disabled: '#ECECE7',
} as const

export const radius = { sm: 12, md: 16, lg: 20, panel: 56, pill: 999 } as const

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 28 } as const

/**
 * One duration for the whole app: 200ms, matching SwiftUI's default
 * `.animation(.easeOut(duration: 0.2))` feel.
 *
 * `press` is the deliberate exception. Press-in feedback is the one moment the
 * user is watching for a response, and 200ms there reads as lag — 120ms is the
 * standard for a touch that happens hundreds of times a day. Change `press` to
 * `base` if you want it uniform.
 */
export const DURATION = { base: 200, press: 120 } as const

/**
 * Strong ease-out. The built-in curves are too weak to read as intentional.
 *
 * Must be Reanimated's `cubicBezier()`, not a CSS `cubic-bezier(...)` string:
 * `transitionTimingFunction` on native only accepts the keyword easings
 * (linear, ease, ease-in, ease-out, ease-in-out, step-start, step-end) or one
 * of Reanimated's easing objects. A raw string throws at render.
 */
export const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1)

/** Spec: minimum touch target 44px; buttons 58px tall. */
export const TAP = 44
export const BUTTON_HEIGHT = 58
/** Borderless filled inputs share the button height. */
export const INPUT_HEIGHT = 58

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const

/**
 * Tabular figures, so money columns and qty steppers don't jitter as digits
 * change. Only iOS and web honour the font-variant style prop; Android picks
 * the feature up from the font file itself.
 */
export const tabular: TextStyle =
  Platform.OS === 'android' ? {} : { fontVariant: ['tabular-nums'] }

/** Type scale from the spec's table. */
export const type = {
  /** Brand wordmark — 30 / 800, letter-spacing -0.8 */
  wordmark: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.8 },
  /** Screen title — 22-32 / 800 */
  title: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  titleSm: { fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  /** Total (big money) — 26-30 / 800 */
  money: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  moneySm: { fontFamily: fonts.extrabold, fontSize: 16, lineHeight: 20, letterSpacing: -0.2 },
  /** Button — 16 / 700 */
  button: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20 },
  /** Body — 15-16 / 500-600 */
  body: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  /** Product name — 14 / 700 */
  itemName: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 },
  /** Caption / badge — 11-13 / 600 */
  caption: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17 },
  badge: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },
} as const

/**
 * Rand, South African convention: space thousands, comma decimals — `R1 284,50`.
 *
 * Not `rand()` from lib/format, which renders `R1,420.00` and is still used by
 * the screens this redesign does not touch. Built by hand rather than with
 * toLocaleString('en-ZA') because Android's Hermes ships without ICU data, so
 * locale separators silently fall back to en-US there.
 */
export function money(n: number, opts: { whole?: boolean } = {}) {
  const negative = n < 0
  const abs = Math.abs(n)
  const cents = Math.round(abs * 100)
  const whole = Math.floor(cents / 100)
  const frac = cents % 100

  // Non-breaking space, so an amount never wraps between thousands and units
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const body = opts.whole ? grouped : `${grouped},${String(frac).padStart(2, '0')}`
  return `${negative ? '-' : ''}R${body}`
}

/** Spec: prices are VAT-inclusive; VAT shown = total x 15/115. */
export const VAT_RATE = 15
export const vatOf = (total: number) => (total * VAT_RATE) / (100 + VAT_RATE)

/** Spec: low stock threshold — under 10. Configurable per product later. */
export const LOW_STOCK = 10

export const shadow = {
  card: Platform.select({
    android: { elevation: 1 },
    default: {
      shadowColor: colors.ink,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
    },
  }),
  float: Platform.select({
    android: { elevation: 10 },
    default: {
      shadowColor: colors.ink,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
    },
  }),
  sheet: Platform.select({
    android: { elevation: 16 },
    default: {
      shadowColor: colors.ink,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
    },
  }),
}
