import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, AlertTriangle, CheckCircle2, MessageCircle, Info, Loader2, BellOff, X, Trash2 } from 'lucide-react'
import { api } from '../services/api.js'
import { useToast, onNotificationsChanged } from '../context/ToastContext.jsx'
import { timeAgo } from '../data/dateUtils.js'

const ICONS = {
  alert: AlertTriangle, emergency: AlertTriangle,
  success: CheckCircle2, system: Info,
  broadcast: MessageCircle, msg: MessageCircle, message: MessageCircle,
}
const COLORS = {
  alert: 'text-emergency', emergency: 'text-emergency',
  success: 'text-success', system: 'text-blue-500',
  broadcast: 'text-ghana-gold', msg: 'text-ghana-gold', message: 'text-ghana-gold',
}

export default function NotificationsScreen() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.notifications.list()
      setItems(r.items || [])
    } catch (err) {
      toast.error(err.message || 'Could not load notifications')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  // Realtime: refresh on any toast→notification + every 15s while open
  useEffect(() => {
    const off = onNotificationsChanged(load)
    const t = setInterval(load, 15000)
    return () => { off(); clearInterval(t) }
  }, [load])

  const unread = items.filter((n) => !n.read).length

  const markAllRead = async () => {
    try {
      await api.notifications.markAllRead()
      setItems((p) => p.map((n) => ({ ...n, read: true })))
      toast.success('All marked as read')
    } catch (e) { toast.error(e.message) }
  }

  const markOne = async (id) => {
    try {
      await api.notifications.markRead(id)
      setItems((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch { /* silent */ }
  }

  const deleteOne = async (id) => {
    try {
      await api.notifications.deleteOne(id)
      setItems((p) => p.filter((n) => n.id !== id))
    } catch (e) { toast.error(e.message) }
  }

  const clearAll = async () => {
    if (!items.length) return
    if (!confirm(`Clear all ${items.length} notification(s)?`)) return
    try {
      await api.notifications.clearAll()
      setItems([])
      toast.success('Cleared')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="px-4 lg:px-0 py-4 pb-8 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-extrabold">Notifications</h1>
        {items.length > 0 && (
          <div className="flex gap-2">
            {unread > 0 && (
              <button onClick={markAllRead}
                className="text-xs text-ghana-gold font-bold whitespace-nowrap">
                Mark all read
              </button>
            )}
            <button onClick={clearAll}
              className="text-xs text-ghana-red font-bold whitespace-nowrap flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Clear all
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card-elevated bg-bg-card p-8 flex items-center justify-center gap-2 text-fg-secondary">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="card-elevated bg-bg-card p-10 text-center text-fg-secondary">
          <BellOff className="w-10 h-10 mx-auto mb-3 text-fg-tertiary" />
          <div className="font-bold text-fg">All quiet</div>
          <div className="text-xs mt-1">
            Notifications appear here when patients are screened,<br />
            referrals are acknowledged, or admins broadcast updates.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((n) => {
              const Icon = ICONS[n.type] || Bell
              const color = COLORS[n.type] || 'text-fg-secondary'
              return (
                <motion.div key={n.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 80, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => !n.read && markOne(n.id)}
                  className={`card-elevated bg-bg-card p-4 flex gap-3 cursor-pointer group ${n.read ? 'opacity-70' : ''}`}>
                  <div className={`w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm truncate">{n.title}</div>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-ghana-gold shrink-0" />}
                    </div>
                    {n.body && <div className="text-xs text-fg-secondary mt-0.5">{n.body}</div>}
                    <div className="text-[10px] text-fg-tertiary mt-1">{timeAgo(n.createdAt)}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteOne(n.id) }}
                    className="shrink-0 self-start p-1.5 rounded-md text-fg-tertiary hover:text-ghana-red hover:bg-ghana-red/10"
                    aria-label="Delete">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
