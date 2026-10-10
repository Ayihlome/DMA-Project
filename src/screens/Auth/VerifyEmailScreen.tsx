import React, { useState } from 'react'
import { Text, TouchableOpacity } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { AuthLayout, Field, SubmitButton } from './AuthForm'
import { styles } from './styles'

export default function VerifyEmailScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(`We emailed a code to ${email}.`)

  async function verify() {
    const token = code.trim()
    if (!/^\d{6,10}$/.test(token)) {
      setError('Enter the code from the email.')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
    setLoading(false)
    // On success Supabase returns a session and the router switches to the tabs
    if (error) setError(error.message)
  }

  async function resend() {
    setResending(true)
    setError(null)
    setNotice(null)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    if (error) setError(error.message)
    else setNotice(`New code sent to ${email}.`)
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="One last step before you can start"
      switchText="Wrong email?"
      switchLabel="Register again"
      switchHref="/register"
    >
      {error && <Text style={styles.error}>{error}</Text>}
      {notice && <Text style={styles.notice}>{notice}</Text>}
      <Field
        label="Verification code"
        value={code}
        onChangeText={text => setCode(text.replace(/\D/g, ''))}
        placeholder="123456"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={10}
        onSubmitEditing={verify}
      />
      <SubmitButton label="Verify" loading={loading} onPress={verify} />
      <TouchableOpacity onPress={resend} disabled={resending} activeOpacity={0.7}>
        <Text style={[styles.switchLink, { textAlign: 'center' }]}>
          {resending ? 'Sending…' : 'Resend code'}
        </Text>
      </TouchableOpacity>
    </AuthLayout>
  )
}
