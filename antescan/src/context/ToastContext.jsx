import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { api, getAuth } from '../services/api.js'

const ToastContext = createContext()

const ICONS = {
  success: <CheckCircle2 className="w-5 h-5" />,
  error: <AlertTriangle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
}
const COLORS = {
  success: 'bg-success/15 text-success border-success/30',
  error: 'bg-ghana-red/15 text-ghana-red border-ghana-red/30',
  info: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  warning: 'bg-ghana-gold/15 text-yellow-700 dark:text-ghana-gold border-ghana-gold/30',
}

const NOTIF_EVT = 'antescan:notifications-changed'
export function emitNotificationsChanged() {
  try { window.dispatchEvent(new CustomEvent(NOTIF_EVT)) } catch {}
}
export function onNotificationsChanged(handler) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(NOTIF_EVT, handler)
  return () => window.removeEventListener(NOTIF_EVT, handler)
}

async function persistToast({ title, body, severity, link }) {
  try {
    if (!getAuth()?.accessToken) return
    await api.notifications.createSelf({
      title, body, severity, link,
      type: severity === 'success' ? 'success'
          : severity === 'error'   ? 'alert'
          : severity === 'warning' ? 'system'
          : 'system',
    })
    emitNotificationsChanged()
  } catch { /* silent */ }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, type = 'info', opts = {}) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)

    const shouldPersist =
      opts.persist === true ||
      (opts.persist !== false && type === 'success')

    if (shouldPersist) {
      persistToast({
        title: opts.title || message,
        body: opts.body || (opts.title ? message : undefined),
        severity: type,
        link: opts.link,
      })
    }
  }, [])

  // ✅ MEMOIZE the context value to prevent infinite loops
  const value = useMemo(() => ({
    success: (m, opts) => push(m, 'success', opts),
    error:   (m, opts) => push(m, 'error', opts),
    info:    (m, opts) => push(m, 'info', opts),
    warning: (m, opts) => push(m, 'warning', opts),
  }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-full max-w-md px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`pointer-events-auto card-elevated border ${COLORS[t.type]} px-4 py-3 flex items-center gap-3`}
            >
              {ICONS[t.type]}
              <span className="text-sm font-medium flex-1">{t.message}</span>
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
                <X className="w-4 h-4 opacity-60" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)