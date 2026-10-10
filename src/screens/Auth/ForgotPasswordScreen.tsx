import React, { useState } from 'react'
import { Text } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { AuthLayout, Field, SubmitButton } from './AuthForm'
import { styles } from './styles'

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>()
  const [email, setEmail] = useState(params.email ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendCode() {
    if (!email.trim()) {
      setError('Enter the email you signed up with.')
      return
    }
    setLoading(true)
    setError(null)
    // Succeeds even for unknown emails, so this screen can't be used to find out who has an account
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
    setLoading(false)
    if (error) setError(error.message)
    else router.push({ pathname: '/reset-password', params: { email: email.trim() } })
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a code to set a new one"
      switchText="Remembered it?"
      switchLabel="Sign in"
      switchHref="/sign-in"
    >
      {error && <Text style={styles.error}>{error}</Text>}
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        onSubmitEditing={sendCode}
      />
      <SubmitButton label="Send code" loading={loading} onPress={sendCode} />
    </AuthLayout>
  )
}
