import React, { type ReactNode } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  type TextInputProps,
} from 'react-native'
import { Link, type Href } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '../../components/common/MaterialIcon'
import { colors } from '../../theme/theme'
import { styles } from './styles'

interface LayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  switchText: string
  switchLabel: string
  switchHref: Href
}

export function AuthLayout({ title, subtitle, children, switchText, switchLabel, switchHref }: LayoutProps) {
  const insets = useSafeAreaInsets()

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <MaterialIcons name="inventory_2" size={28} color={colors.onPrimary} />
            </View>
            <Text style={styles.shopName}>StockMate</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            {children}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{switchText}</Text>
            <Link href={switchHref} replace>
              <Text style={styles.switchLink}>{switchLabel}</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} {...props} />
    </View>
  )
}

export function SubmitButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>{label}</Text>}
    </TouchableOpacity>
  )
}
