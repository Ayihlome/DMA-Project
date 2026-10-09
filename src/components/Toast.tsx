import { createContext, type Context, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Icon } from './ui'

type Tone = 'success' | 'error' | 'info'
type Toast = { id: number; message: string; tone: Tone }

type ShowToast = (message: string, tone?: Tone) => void
// Same instance across hot reloads (see data/store.tsx).
const g = globalThis as typeof globalThis & { __stockevoToastContext?: Context<ShowToast> }
const ToastContext = (g.__stockevoToastContext ??= createContext<ShowToast>(() => {}))

const TONE: Record<Tone, { icon: string; className: string }> = {
  success: { icon: 'check_circle', className: 'text-secondary-fixed' },
  error: { icon: 'error', className: 'text-error-container' },
  info: { icon: 'info', className: 'text-inverse-primary' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const next = useRef(1)
  const show = useCallback((message: string, tone: Tone = 'success') => {
    const id = next.current++
    setToasts((t) => [...t.slice(-2), { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 5000 : 3200)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="fixed z-70 top-app-header lg:top-space-lg left-1/2 -translate-x-1/2 mt-space-xs flex flex-col items-center gap-space-xs w-full max-w-md px-space-md pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto w-full bg-inverse-surface text-inverse-on-surface px-space-md py-space-sm rounded-xl shadow-float flex items-center gap-space-xs"
          >
            <Icon name={TONE[t.tone].icon} className={TONE[t.tone].className} />
            <span className="font-label text-label">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
