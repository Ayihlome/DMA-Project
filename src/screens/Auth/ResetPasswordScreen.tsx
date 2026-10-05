import React, { useState } from 'react'
import { Text, TouchableOpacity } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../providers/AuthProvider'
import { AuthLayout, Field, SubmitButton } from './AuthForm'
import { styles } from './styles'

export default function ResetPasswordScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>()
  const { recovering, finishRecovery } = useAuth()
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(`If ${email} has an account, we emailed it a code.`)

  async function resetPassword() {
    // Once the code is verified it can't be used again, so a retry only needs the password
    if (!recovering && !/^\d{6,10}$/.test(code.trim())) {
      setError('Enter the code from the email.')
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
    setLoading(true)
    setError(null)

    if (!recovering) {
      // Signs the user in, but the AuthProvider keeps them here until the password is saved
      const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'recovery' })
      if (error) {
        setLoading(false)
        setError(error.message)
        return
      }
    }

    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    // The router switches to the tabs
    finishRecovery()
  }

  async function resend() {
    setResending(true)
    setError(null)
    setNotice(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setResending(false)
    if (error) setError(error.message)
    else setNotice(`New code sent to ${email}.`)
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle={recovering ? 'Code accepted. Pick your new password' : 'Enter the code we emailed you'}
      switchText="Wrong email?"
      switchLabel="Start again"
      switchHref="/forgot-password"
    >
      {error && <Text style={styles.error}>{error}</Text>}
      {notice && !recovering && <Text style={styles.notice}>{notice}</Text>}
      {!recovering && (
        <Field
          label="Code"
          value={code}
          onChangeText={text => setCode(text.replace(/\D/g, ''))}
          placeholder="123456"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={10}
        />
      )}
      <Field
        label="New password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 6 characters"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Field
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Type it again"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={resetPassword}
      />
      <SubmitButton label="Save new password" loading={loading} onPress={resetPassword} />
      {!recovering && (
        <TouchableOpacity onPress={resend} disabled={resending} activeOpacity={0.7}>
          <Text style={[styles.switchLink, { textAlign: 'center' }]}>
            {resending ? 'Sending…' : 'Resend code'}
          </Text>
        </TouchableOpacity>
      )}
    </AuthLayout>
  )
}
