import React, { useContext, type ReactNode } from 'react'
import { Text, View, type TextInputProps } from 'react-native'
import { Link, router, type Href } from 'expo-router'
import FilledInput from '../../components/ui/FilledInput'
import PrimaryButton from '../../components/ui/PrimaryButton'
import SegmentedPill from '../../components/ui/SegmentedPill'
import AuthShell, { AuthHeading, HEADER_COMPACT, HEADER_TALL } from './AuthShell'
import { AuthPagerContext } from './authPagerContext'
import { styles } from './styles'

/** Which segmented-pill tab is current, or `none` on screens outside the pair. */
export type AuthSegment = 'sign-in' | 'register' | 'none'

const SEGMENTS = [
  { key: 'sign-in', label: 'Sign in' },
  { key: 'register', label: 'Create account' },
]

interface LayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  switchText: string
  switchLabel: string
  switchHref: Href
  /**
   * Shows the segmented pill with this tab active. `none` (the default) falls
   * back to the plain switch link, which is what Verify needs — it isn't one of
   * the two pill destinations.
   */
  segment?: AuthSegment
}

export function AuthLayout({
  title,
  subtitle,
  children,
  switchText,
  switchLabel,
  switchHref,
  segment = 'none',
}: LayoutProps) {
  const paired = segment !== 'none'
  const pager = useContext(AuthPagerContext)

  return (
    <AuthShell
      // Create account has five fields and a consent row, so it gets the
      // shortest header to leave room
      headerHeight={segment === 'register' ? HEADER_COMPACT : HEADER_TALL}
      footer={
        paired ? (
          <SegmentedPill
            segments={SEGMENTS}
            active={segment}
            onSelect={(key) => {
              if (key === segment) return
              const target = key === 'sign-in' ? 'sign-in' : 'register'
              // Inside the pager, slide to the other page; anywhere else, route
              if (pager) pager.goTo(target)
              else router.replace(`/${target}`)
            }}
          />
        ) : (
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{switchText}</Text>
            <Link href={switchHref} replace style={styles.switchLink}>
              {switchLabel}
            </Link>
          </View>
        )
      }
    >
      <AuthHeading title={title} subtitle={subtitle} />
      <View style={styles.form}>{children}</View>
    </AuthShell>
  )
}

/**
 * A form field. The spec puts the label *inside* the box as the placeholder, so
 * `label` is both — see FilledInput for why that makes accessibilityLabel
 * mandatory.
 *
 * `placeholder` is accepted and ignored so the screens didn't have to change;
 * pass `hint` for rules worth keeping visible, like a password minimum.
 */
export function Field({
  label,
  hint,
  placeholder: _ignored,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  return <FilledInput label={label} hint={hint} {...props} />
}

export function SubmitButton({
  label,
  loading,
  onPress,
  disabled,
}: {
  label: string
  loading: boolean
  onPress: () => void
  disabled?: boolean
}) {
  return <PrimaryButton label={label} loading={loading} onPress={onPress} disabled={disabled} />
}
