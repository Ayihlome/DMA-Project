/** Native counterparts of ../src/components/ui.tsx, styled with the same tokens. */
import { useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Health, Product } from './core'
import { useStore } from './store'
import { TAP, colors, gradient, radius, shadow, space, type } from './theme'

/* ------------------------------------------------------------------ Icon */

// Material Symbols names used by the website that the native MaterialIcons font lacks.
const ICON_ALIAS: Record<string, string> = { monitoring: 'insights', progress_activity: 'autorenew', skillet: 'outdoor_grill' }
const ICON_SIZE = { xs: 14, sm: 16, md: 20, lg: 24, xl: 32 }
export type IconSize = keyof typeof ICON_SIZE

export function Icon({ name, size = 'md', color = colors.textPrimary, style }: { name: string; size?: IconSize; color?: string; style?: StyleProp<TextStyle> }) {
  const glyph = (ICON_ALIAS[name] ?? name).replace(/_/g, '-')
  const known = glyph in MaterialIcons.glyphMap
  return (
    <MaterialIcons
      name={(known ? glyph : 'circle') as keyof typeof MaterialIcons.glyphMap}
      size={ICON_SIZE[size]}
      color={color}
      style={style}
      accessible={false}
      importantForAccessibility="no"
    />
  )
}

/* -------------------------------------------------------------- Gradient */

export function Gradient({ style, children, angle = 'diagonal' }: { style?: StyleProp<ViewStyle>; children?: ReactNode; angle?: 'diagonal' | 'horizontal' }) {
  return (
    <LinearGradient
      colors={gradient.colors}
      locations={gradient.locations}
      start={{ x: 0, y: 0 }}
      end={angle === 'diagonal' ? { x: 1, y: 1 } : { x: 1, y: 0 }}
      style={style}
    >
      {children}
    </LinearGradient>
  )
}

/* ---------------------------------------------------------------- Button */

export type Variant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger' | 'success'
const VARIANT: Record<Variant, { bg?: string; fg: string; border?: string; pressed: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary, pressed: colors.accentPressed },
  brand: { fg: colors.onPrimary, pressed: colors.accentPressed },
  secondary: { bg: colors.bgSurface, fg: colors.primary, border: colors.primary, pressed: colors.accentTint },
  ghost: { fg: colors.primary, pressed: colors.accentTint },
  danger: { fg: colors.errorDefault, pressed: colors.errorTint },
  success: { bg: colors.secondary, fg: colors.onSecondary, pressed: colors.secondary },
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconEnd,
  block,
  disabled,
  busy,
  onPress,
  children,
  accessibilityLabel,
  style,
}: {
  variant?: Variant
  size?: 'md' | 'sm'
  icon?: string
  iconEnd?: string
  block?: boolean
  disabled?: boolean
  busy?: boolean
  onPress?: () => void
  children: ReactNode
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}) {
  const v = VARIANT[variant]
  const body = (
    <>
      {busy ? <ActivityIndicator size="small" color={v.fg} /> : icon ? <Icon name={icon} color={v.fg} /> : null}
      <Text style={[type.labelBold, { color: v.fg }]} numberOfLines={1}>
        {children}
      </Text>
      {iconEnd && <Icon name={iconEnd} color={v.fg} />}
    </>
  )
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      style={({ pressed }) => [
        s.btn,
        { paddingHorizontal: size === 'md' ? space.md : space.sm },
        block && { alignSelf: 'stretch' },
        v.bg && { backgroundColor: v.bg },
        v.border && { borderWidth: 1, borderColor: v.border },
        variant === 'primary' && !disabled && shadow.sm,
        pressed && variant !== 'brand' && { backgroundColor: v.pressed },
        (disabled || busy) && { opacity: 0.6 },
        style,
      ]}
    >
      {variant === 'brand' ? <Gradient angle="horizontal" style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]} /> : null}
      {body}
    </Pressable>
  )
}

export function IconButton({ icon, label, onPress, color = colors.textSecondary }: { icon: string; label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [s.iconBtn, pressed && { backgroundColor: colors.surfaceContainerLow }]}
    >
      <Icon name={icon} color={color} />
    </Pressable>
  )
}

/* ------------------------------------------------------------------ Card */

export function Card({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return <View style={[s.card, style]}>{children}</View>
}

/* ----------------------------------------------------------- Status/Pill */

const HEALTH: Record<Health, { label: string; icon: string; soft: [string, string]; solid: [string, string] }> = {
  setup: { label: 'Recipe missing', icon: 'lock', soft: [colors.errorTint, colors.errorDefault], solid: [colors.errorDefault, colors.onError] },
  out: { label: 'Out of stock', icon: 'block', soft: [colors.errorTint, colors.errorDefault], solid: [colors.errorDefault, colors.onError] },
  critical: { label: 'Critical', icon: 'warning', soft: [colors.errorTint, colors.errorDefault], solid: [colors.errorDefault, colors.onError] },
  low: { label: 'Low', icon: 'flag', soft: [colors.warningTint, colors.tertiary], solid: [colors.warningDefault, colors.onPrimary] },
  healthy: { label: 'Healthy', icon: 'check_circle', soft: [colors.successTint, colors.secondary], solid: [colors.secondary, colors.onSecondary] },
}
export const healthLabel = (h: Health) => HEALTH[h].label

/** Icon + text so status never relies on colour alone. `solid` for urgent lists. */
export function StatusBadge({ health, solid }: { health: Health; solid?: boolean }) {
  const h = HEALTH[health]
  const [bg, fg] = solid ? h.solid : h.soft
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      <Icon name={h.icon} size="xs" color={fg} />
      <Text style={[solid ? s.solidText : type.captionMedium, { color: fg }]}>{solid ? h.label.toUpperCase() : h.label}</Text>
    </View>
  )
}

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'error' | 'purple'
export const TONES: Record<Tone, [string, string]> = {
  neutral: [colors.surfaceContainerLow, colors.textSecondary],
  brand: [colors.accentTint, colors.primary],
  success: [colors.successTint, colors.secondary],
  warning: [colors.warningTint, colors.tertiary],
  error: [colors.errorTint, colors.errorDefault],
  purple: [colors.brandPurpleTint, colors.brandPurple],
}

export function Pill({ tone = 'neutral', icon, children, bg, fg }: { tone?: Tone; icon?: string; children: ReactNode; bg?: string; fg?: string }) {
  const [b, f] = TONES[tone]
  return (
    <View style={[s.pill, { backgroundColor: bg ?? b }]}>
      {icon && <Icon name={icon} size="xs" color={fg ?? f} />}
      <Text style={[type.captionMedium, { color: fg ?? f }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  )
}

/* ---------------------------------------------------------- Tabs/toggles */

export function Tabs<K extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { key: K; label: string; icon?: string; count?: number }[]
  value: K
  onChange: (k: K) => void
  label: string
}) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={s.tabs}>
      {items.map((t) => {
        const active = t.key === value
        const fg = active ? colors.primary : colors.textSecondary
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(t.key)}
            style={[s.tab, active && s.tabActive]}
          >
            {t.icon && <Icon name={t.icon} size="sm" color={fg} />}
            <Text style={[active ? type.labelBold : type.label, { color: fg }]} numberOfLines={1}>
              {t.label}
            </Text>
            {t.count !== undefined && (
              <View style={[s.count, { backgroundColor: active ? colors.accentTint : colors.surfaceContainerLow }]}>
                <Text style={[type.captionMedium, { color: fg }]}>{t.count}</Text>
              </View>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}

export function ToggleGroup<K extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { key: K; label: string }[]
  value: K
  onChange: (k: K) => void
  label: string
}) {
  return (
    <View accessibilityLabel={label} style={s.toggle}>
      {items.map((t) => {
        const on = value === t.key
        return (
          <Pressable
            key={t.key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(t.key)}
            style={[s.toggleItem, on && s.toggleOn]}
          >
            <Text style={[type.captionMedium, { color: on ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
              {t.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function Chip({ selected, onPress, children }: { selected: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.chip, { backgroundColor: selected ? colors.primary : colors.surfaceContainerLow }]}
    >
      <Text style={[selected ? type.labelBold : type.label, { color: selected ? colors.onPrimary : colors.textSecondary }]}>{children}</Text>
    </Pressable>
  )
}

/** Horizontal scroller for chips and filters (the web `overflow-x-auto no-scrollbar` rows). */
export function HScroll({ children, inset = space.md }: { children: ReactNode; inset?: number }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -inset }}
      contentContainerStyle={{ paddingHorizontal: inset, gap: space.xs }}
    >
      {children}
    </ScrollView>
  )
}

/* ---------------------------------------------------------------- Inputs */

export function SearchField({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string }) {
  return (
    <View style={s.search}>
      <Icon name="search" color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={label}
        returnKeyType="search"
        autoCorrect={false}
        style={[type.body, s.searchInput]}
      />
      {!!value && <IconButton icon="close" label="Clear search" onPress={() => onChange('')} />}
    </View>
  )
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space['2xs'] }}>
      <Text style={[type.captionMedium, { color: colors.textSecondary }]}>{label}</Text>
      {children}
      {error ? (
        <Text style={[type.caption, { color: colors.errorDefault }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[type.caption, { color: colors.textSecondary }]}>{hint}</Text>
      ) : null}
    </View>
  )
}

export function TextField({ style, invalid, ...rest }: TextInputProps & { invalid?: boolean }) {
  const [focus, setFocus] = useState(false)
  return (
    <TextInput
      placeholderTextColor={colors.textSecondary}
      {...rest}
      onFocus={(e) => {
        setFocus(true)
        rest.onFocus?.(e)
      }}
      onBlur={(e) => {
        setFocus(false)
        rest.onBlur?.(e)
      }}
      style={[
        type.body,
        s.input,
        focus && { borderColor: colors.primary, backgroundColor: colors.bgSurface },
        invalid && { borderColor: colors.errorDefault },
        rest.editable === false && { color: colors.textSecondary },
        style,
      ]}
    />
  )
}

/** Replacement for the web <select>: a field that opens a sheet of options. */
export function Select<K extends string>({
  value,
  options,
  onChange,
  label,
  title,
  left,
  compact,
}: {
  value: K
  options: { key: K; label: string; sub?: string }[]
  onChange: (k: K) => void
  label: string
  title?: string
  left?: ReactNode
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.key === value)
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? 'none'}`}
        accessibilityHint="Opens a list of options"
        onPress={() => setOpen(true)}
        style={[compact ? s.selectCompact : s.input, s.selectRow]}
      >
        {left}
        <Text style={[compact ? type.captionMedium : type.labelBold, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>
          {current?.label ?? 'Choose…'}
        </Text>
        <Icon name="unfold_more" color={colors.textSecondary} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={title ?? label}>
        <View style={{ gap: space['2xs'] }}>
          {options.map((o) => {
            const on = o.key === value
            return (
              <Pressable
                key={o.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  onChange(o.key)
                  setOpen(false)
                }}
                style={({ pressed }) => [s.option, on && { backgroundColor: colors.accentTint }, pressed && { backgroundColor: colors.surfaceContainerLow }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[on ? type.labelBold : type.label, { color: on ? colors.primary : colors.textPrimary }]}>{o.label}</Text>
                  {o.sub && <Text style={[type.caption, { color: colors.textSecondary }]}>{o.sub}</Text>}
                </View>
                {on && <Icon name="check" color={colors.primary} />}
              </Pressable>
            )
          })}
        </View>
      </Sheet>
    </>
  )
}

/** +/- quantity control shared by the cart and the restock plan. */
export function Stepper({
  value,
  onMinus,
  onPlus,
  minusIcon = 'remove',
  minusDisabled,
  plusDisabled,
  minusLabel,
  plusLabel,
  minWidth = 32,
}: {
  value: string
  onMinus: () => void
  onPlus: () => void
  minusIcon?: string
  minusDisabled?: boolean
  plusDisabled?: boolean
  minusLabel: string
  plusLabel: string
  minWidth?: number
}) {
  return (
    <View style={s.stepper}>
      <Pressable onPress={onMinus} disabled={minusDisabled} accessibilityRole="button" accessibilityLabel={minusLabel} style={[s.stepBtn, minusDisabled && { opacity: 0.4 }]}>
        <Icon name={minusIcon} />
      </Pressable>
      <Text style={[type.labelBold, { color: colors.textPrimary, minWidth, textAlign: 'center' }]} accessibilityLiveRegion="polite">
        {value}
      </Text>
      <Pressable onPress={onPlus} disabled={plusDisabled} accessibilityRole="button" accessibilityLabel={plusLabel} style={[s.stepBtn, plusDisabled && { opacity: 0.4 }]}>
        <Icon name="add" />
      </Pressable>
    </View>
  )
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      hitSlop={10}
      style={[s.checkbox, checked && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      {checked && <Icon name="check" size="sm" color={colors.onPrimary} />}
    </Pressable>
  )
}

export function Radio({ checked }: { checked: boolean }) {
  return <View style={[s.radio, checked && { borderColor: colors.primary }]}>{checked && <View style={s.radioDot} />}</View>
}

/* ------------------------------------------------------------ Tiles etc. */

export function StatTile({
  label,
  value,
  sub,
  tone = colors.textPrimary,
  icon,
  iconTone = [colors.accentTint, colors.primary],
  style,
}: {
  label: string
  value: string
  sub?: ReactNode
  tone?: string
  icon?: string
  iconTone?: [string, string]
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[s.card, s.statTile, style]}>
      <View style={s.rowBetween}>
        <Text style={[type.captionMedium, { color: colors.textSecondary, flex: 1 }]} numberOfLines={1}>
          {label}
        </Text>
        {icon && (
          <View style={[s.statIcon, { backgroundColor: iconTone[0] }]}>
            <Icon name={icon} size="sm" color={iconTone[1]} />
          </View>
        )}
      </View>
      <View>
        <Text style={[type.h1, { color: tone }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {typeof sub === 'string' ? (
          <Text style={[type.caption, { color: colors.textSecondary }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : (
          sub
        )}
      </View>
    </View>
  )
}

export function Figure({ label, value, tone = colors.textPrimary, style }: { label: string; value: string | number; tone?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.figure, style]}>
      <Text style={[type.caption, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[type.labelBold, { color: tone }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon name={icon} size="lg" color={colors.primary} />
      </View>
      <Text style={[type.labelBold, { color: colors.textPrimary, textAlign: 'center' }]}>{title}</Text>
      {body && <Text style={[type.caption, { color: colors.textSecondary, textAlign: 'center', maxWidth: 280 }]}>{body}</Text>}
      {action && <View style={{ paddingTop: space.xs }}>{action}</View>}
    </View>
  )
}

export function Meter({ percent, tone, label, height = 6 }: { percent: number; tone?: string; label: string; height?: number }) {
  const width = `${Math.max(0, Math.min(100, percent))}%` as const
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
      style={[s.track, { height, borderRadius: height }]}
    >
      {tone ? (
        <View style={{ width, height: '100%', borderRadius: height, backgroundColor: tone }} />
      ) : (
        <Gradient angle="horizontal" style={{ width, height: '100%', borderRadius: height }} />
      )}
    </View>
  )
}

/* ----------------------------------------------------------------- Sheet */

/** Bottom sheet dialog (the web Modal renders as a bottom sheet on phones too). */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close dialog" accessibilityRole="button" />
        <View style={[s.sheet, { paddingBottom: space.lg + insets.bottom }]} accessibilityViewIsModal>
          <View style={[s.rowBetween, { alignItems: 'flex-start', gap: space.md }]}>
            <View style={{ flex: 1, gap: space['2xs'] }}>
              <Text style={[type.h2, { color: colors.textPrimary }]} accessibilityRole="header">
                {title}
              </Text>
              {description && <Text style={[type.caption, { color: colors.textSecondary }]}>{description}</Text>}
            </View>
            <IconButton icon="close" label="Close" onPress={onClose} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.sm, paddingVertical: space.xs }} style={{ flexGrow: 0 }}>
            {children}
          </ScrollView>
          {footer && <View style={{ gap: space.xs }}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

/* ---------------------------------------------------------- Thumb/brand */

const THUMB = { sm: 40, md: 48 }

export function ProductThumb({
  product,
  size = 'md',
  fill,
  grayscale,
  style,
}: {
  product: Product
  size?: keyof typeof THUMB
  fill?: boolean
  grayscale?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const { photos } = useStore()
  const [failed, setFailed] = useState<string | null>(null)
  const src = photos[product.id] ?? product.image
  const dims = fill ? { width: '100%' as const, height: '100%' as const } : { width: THUMB[size], height: THUMB[size], borderRadius: size === 'sm' ? radius.lg : radius.xl }
  return (
    <View style={[s.thumb, dims, style]}>
      {src && failed !== src ? (
        <Image
          source={{ uri: src }}
          onError={() => setFailed(src)}
          style={[StyleSheet.absoluteFill, grayscale && { opacity: 0.45 }]}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Icon name={product.icon} size={size === 'sm' && !fill ? 'md' : 'lg'} color={colors.primary} />
      )}
    </View>
  )
}

export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const d = size === 'md' ? 40 : 32
  return (
    <Gradient style={[s.center, { width: d, height: d, borderRadius: size === 'md' ? radius.xl : radius.lg }]}>
      <Icon name="stacked_line_chart" size={size === 'md' ? 'lg' : 'md'} color={colors.onPrimary} />
    </Gradient>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'
  const d = { sm: 36, md: 40, lg: 96 }[size]
  return (
    <Gradient style={[s.center, { width: d, height: d, borderRadius: size === 'lg' ? radius['2xl'] : d / 2 }]}>
      <Text style={[size === 'lg' ? type.display : size === 'md' ? type.labelBold : type.captionMedium, { color: colors.onPrimary }]}>{initials}</Text>
    </Gradient>
  )
}

export const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btn: {
    minHeight: TAP,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    overflow: 'hidden',
  },
  iconBtn: { width: TAP, height: TAP, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.bgSurface, borderRadius: radius.xl, ...shadow.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  solidText: { ...type.labelBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
  tabs: { flexDirection: 'row', padding: space['2xs'], borderRadius: radius.xl, backgroundColor: colors.surfaceContainer, gap: space['2xs'] },
  tab: {
    flex: 1,
    minHeight: TAP,
    paddingHorizontal: space.sm,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space['2xs'],
  },
  tabActive: { backgroundColor: colors.bgSurface, ...shadow.sm },
  count: { minWidth: 20, paddingHorizontal: 6, borderRadius: radius.full, alignItems: 'center' },
  toggle: { flexDirection: 'row', padding: space['2xs'], borderRadius: radius.lg, backgroundColor: colors.surfaceContainerLow, alignSelf: 'flex-start' },
  toggleItem: { minHeight: 40, paddingHorizontal: space.sm, borderRadius: radius.sm, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.bgSurface, ...shadow.sm },
  chip: { minHeight: TAP, paddingHorizontal: space.md, borderRadius: radius.full, justifyContent: 'center' },
  search: {
    height: TAP,
    paddingLeft: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  searchInput: { flex: 1, color: colors.textPrimary, paddingVertical: 0 },
  input: {
    minHeight: TAP,
    paddingHorizontal: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  selectCompact: { minHeight: TAP, flex: 1 },
  option: { minHeight: TAP, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSurface, borderRadius: radius.lg, ...shadow.sm },
  stepBtn: { width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderDisabled,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSurface,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderDisabled, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  statTile: { padding: space.md, justifyContent: 'space-between', gap: space.xs },
  statIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  figure: { borderRadius: radius.lg, backgroundColor: colors.surfaceContainerLow, paddingHorizontal: space.sm, paddingVertical: space.xs, flex: 1, minWidth: 0 },
  empty: { paddingVertical: space.xl, paddingHorizontal: space.md, alignItems: 'center', gap: space.xs },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  track: { width: '100%', backgroundColor: colors.surfaceContainerLow, overflow: 'hidden' },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    padding: space.lg,
    gap: space.md,
    ...shadow.float,
  },
  thumb: { backgroundColor: colors.surfaceContainerLow, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
})
