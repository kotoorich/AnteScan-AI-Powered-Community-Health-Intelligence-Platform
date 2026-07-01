import { useEffect, useState, useCallback } from 'react'
import {
  Bell, AlertTriangle, CheckCircle2, MessageCircle, Info, CheckSquare,
  Trash2, X, Loader2, BellOff,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../services/api.js'
import { useToast, onNotificationsChanged } from '../context/ToastContext.jsx'
import { timeAgo } from '../data/dateUtils.js'

const ICONS = {
  alert: AlertTriangle, emergency: AlertTriangle,
  system: Info, success: CheckCircle2,
  broadcast: MessageCircle, msg: MessageCircle, message: MessageCircle,
}
const COLORS = {
  alert: 'text-emergency', emergency: 'text-emergency',
  system: 'text-blue-500', success: 'text-success',
  broadcast: 'text-ghana-gold', msg: 'text-ghana-gold', message: 'text-ghana-gold',
}
const FILTERS = ['All', 'Alerts', 'System', 'Messages', 'Unread']

export default function AdminNotifications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
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

  useEffect(() => {
    const off = onNotificationsChanged(load)
    const t = setInterval(load, 15000)
    return () => { off(); clearInterval(t) }
  }, [load])

  const filtered = items.filter((n) => {
    if (filter === 'All') return true
    if (filter === 'Unread') return !n.read
    if (filter === 'Alerts') return n.type === 'alert' || n.type === 'emergency'
    if (filter === 'System') return n.type === 'system' || n.type === 'success'
    if (filter === 'Messages') return n.type === 'msg' || n.type === 'message' || n.type === 'broadcast'
    return true
  })

  const unreadCount = items.filter((n) => !n.read).length

  const markAllRead = async () => {
    try {
      await api.notifications.markAllRead()
      await load()
      toast.success('All notifications marked read')
    } catch (e) { toast.error(e.message) }
  }

  const deleteOne = async (id) => {
    try {
      await api.notifications.deleteOne(id)
      setItems((prev) => prev.filter((n) => n.id !== id))
    } catch (e) { toast.error(e.message) }
  }

  const clearAll = async () => {
    if (!items.length) return
    if (!confirm(`Clear all ${items.length} notification(s)? They won't appear again.`)) return
    try {
      const r = await api.notifications.clearAll()
      setItems([])
      toast.success(`Cleared ${r.cleared || items.length} notifications`)
    } catch (e) { toast.error(e.message) }
  }

  const markOneRead = async (id) => {
    try {
      await api.notifications.markRead(id)
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch (e) { /* silent */ }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-ghana-gold mb-1">System</div>
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
            <Bell className="w-7 h-7 text-ghana-gold" /> Notifications
          </h1>
          <p className="text-sm text-fg-secondary">
            {loading ? 'Loading…' : `${unreadCount} unread · ${items.length} total`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={markAllRead} disabled={!unreadCount}
            className="btn-outline flex items-center gap-2 disabled:opacity-40">
            <CheckSquare className="w-4 h-4" /> Mark all read
          </button>
          <button onClick={clearAll} disabled={!items.length}
            className="btn-outline text-ghana-red border-ghana-red/40 hover:bg-ghana-red/10 flex items-center gap-2 disabled:opacity-40">
            <Trash2 className="w-4 h-4" /> Clear all
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
              filter === f
                ? 'bg-ghana-gold text-black border-ghana-gold'
                : 'border-border text-fg-secondary hover:bg-bg-secondary'
            }`}>
            {f}{f === 'Unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card-elevated bg-bg-card p-10 flex items-center justify-center gap-2 text-fg-secondary">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading notifications…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-elevated bg-bg-card p-14 text-center text-fg-secondary">
          <BellOff className="w-12 h-12 mx-auto mb-3 text-fg-tertiary" />
          <div className="font-bold text-fg text-lg">
            {items.length === 0 ? 'No notifications yet' : `No ${filter.toLowerCase()} notifications`}
          </div>
          <div className="text-xs mt-2 max-w-md mx-auto">
            {items.length === 0
              ? 'Notifications will appear here when alerts are raised, models are retrained, broadcasts are sent, or new CHWs register.'
              : 'Try a different filter.'}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {filtered.map((n) => {
              const Icon = ICONS[n.type] || Bell
              const color = COLORS[n.type] || 'text-fg-secondary'
              return (
                <motion.div key={n.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => !n.read && markOneRead(n.id)}
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
                    className="shrink-0 self-start p-1.5 rounded-md text-fg-tertiary hover:text-ghana-red hover:bg-ghana-red/10 opacity-0 group-hover:opacity-100 transition"
                    aria-label="Delete notification">
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
