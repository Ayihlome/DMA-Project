import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native'
import { Icon } from './ui'
import { colors, radius, shadow, space, type } from './theme'

type Tone = 'success' | 'error' | 'info'
type Toast = { id: number; message: string; tone: Tone }

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {})
const TONE: Record<Tone, { icon: string; color: string }> = {
  success: { icon: 'check_circle', color: '#83d8a6' },
  error: { icon: 'error', color: '#ffb4ab' },
  info: { icon: 'info', color: '#B8C3FF' },
}

/** Same messages and tones as the website toasts, shown above the bottom navigation. */
export function ToastProvider({ children, bottomOffset }: { children: ReactNode; bottomOffset: number }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const opacity = useRef(new Animated.Value(0)).current
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(
    (message: string, tone: Tone = 'success') => {
      if (timer.current) clearTimeout(timer.current)
      setToast({ id: Date.now(), message, tone })
      AccessibilityInfo.announceForAccessibility(message)
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start()
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null))
      }, 3500)
    },
    [opacity],
  )

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[styles.wrap, { bottom: bottomOffset + space.sm, opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}
        >
          <View style={styles.toast} accessibilityLiveRegion="polite">
            <Icon name={TONE[toast.tone].icon} color={TONE[toast.tone].color} />
            <Text style={[type.label, { color: colors.inverseOnSurface, flex: 1 }]}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.md, right: space.md, alignItems: 'center', zIndex: 100 },
  toast: {
    maxWidth: 480,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.inverseSurface,
    ...shadow.float,
  },
})
