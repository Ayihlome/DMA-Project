import React, { useState } from 'react'
import { Text, View } from 'react-native'
import { router, Link } from 'expo-router'
import Checkbox from '../../components/ui/Checkbox'
import { supabase } from '../../lib/supabase'
import { AuthLayout, Field, SubmitButton } from './AuthForm'
import { styles } from './styles'

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('')
  const [shopName, setShopName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function register() {
    if (!fullName.trim() || !shopName.trim() || !email.trim() || !password) {
      setError('Fill in your name, your shop name, email and password.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (!consent) {
      setError('Please agree to the privacy notice to create an account.')
      return
    }

    setLoading(true)
    setError(null)
    // POPIA: the moment consent was given travels as metadata, because the
    // profile row only exists once the email is verified. The trigger in
    // 20261010120000_profile_consent.sql copies it into profiles.consent_at.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          shop_name: shopName.trim(),
          consent_at: new Date().toISOString(),
        },
      },
    })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else if (!data.session) {
      // Supabase has "Confirm email" switched on, so there's no session until the emailed code is entered
      router.push({ pathname: '/verify', params: { email: email.trim() } })
    }
    // Otherwise the new session logs them straight in
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="Set up your shop in a minute"
      switchText="Already have an account?"
      switchLabel="Sign in"
      switchHref="/sign-in"
      segment="register"
    >
      {error && <Text style={styles.error}>{error}</Text>}
      <Field
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
        placeholder="Bongani Dlamini"
        autoComplete="name"
        textContentType="name"
      />
      <Field
        label="Shop name"
        value={shopName}
        onChangeText={setShopName}
        placeholder="Bongani's Spaza"
        autoComplete="organization"
        textContentType="organizationName"
      />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        hint="At least 6 characters"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Field
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Type it again"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={register}
      />
      <View style={styles.consentRow}>
        <Checkbox
          checked={consent}
          onToggle={() => setConsent(c => !c)}
          accessibilityLabel="Agree to the privacy notice"
        />
        <Text style={styles.consentText}>
          I agree that StockEvo may store my shop&apos;s stock and sales data to run the app.{' '}
          <Link href="/privacy">
            <Text style={styles.consentLink}>Read the privacy notice</Text>
          </Link>
        </Text>
      </View>
      <SubmitButton label="Create account" loading={loading} onPress={register} disabled={!consent} />
    </AuthLayout>
  )
}
