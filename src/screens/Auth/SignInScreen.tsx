import React, { useState } from 'react'
import { Text } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { REAL_AUTH, useAuth } from '../../providers/AuthProvider'
import { AuthLayout, Field, SubmitButton } from './AuthForm'
import { styles } from './styles'

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { enterApp } = useAuth()

  async function signIn() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    if (!REAL_AUTH) {
      enterApp()
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    // On success the AuthProvider picks up the new session and the router switches to the tabs
    if (error?.code === 'email_not_confirmed') {
      // Send a fresh code and let them finish verifying
      await supabase.auth.resend({ type: 'signup', email: email.trim() })
      setLoading(false)
      router.push({ pathname: '/verify', params: { email: email.trim() } })
      return
    }
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Track stock, sales and restocks for your shop"
      switchText="New here?"
      switchLabel="Create an account"
      switchHref="/register"
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
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={signIn}
      />
      <SubmitButton label="Sign in" loading={loading} onPress={signIn} />
    </AuthLayout>
  )
}
