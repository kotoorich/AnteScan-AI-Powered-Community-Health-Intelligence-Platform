import { useEffect, useState } from 'react'
import { Bell, Moon, Sun, ChevronDown, WifiOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useOffline } from '../../context/OfflineContext.jsx'
import { api } from '../../services/api.js'
import { onNotificationsChanged } from '../../context/ToastContext.jsx'
import Avatar from '../ui/Avatar.jsx'

export default function TopHeader() {
  const { theme, toggle } = useTheme()
  const { user } = useAuth()
  const { online } = useOffline()
  const nav = useNavigate()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let alive = true
    const poll = async () => {
      try {
        const r = await api.notifications.unreadCount()
        if (alive) setUnread(r.count || 0)
      } catch { /* silent */ }
    }
    poll()
    const t = setInterval(poll, 10000)  // 10s real-time poll
    // Instant refresh when a toast persists a new notification
    const off = onNotificationsChanged(poll)
    return () => { alive = false; clearInterval(t); off() }
  }, [])

  const initials = (user?.name || 'CHW')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur safe-top">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <button
          onClick={() => nav('/more')}
          className="flex items-center gap-3 active:opacity-70"
        >
          <Avatar
            url={user?.avatarUrl}
            name={user?.name}
            size={44}
            ringClass="ring-2 ring-ghana-gold/30 shadow-gold-glow"
          />
          <div className="text-left">
            <div className="flex items-center gap-1">
              <span className="font-display font-bold text-fg leading-tight">Hello, {user?.name?.split(' ')[0] || 'CHW'}!</span>
              <ChevronDown className="w-4 h-4 text-fg-tertiary" />
            </div>
            <div className="text-xs text-fg-secondary leading-tight truncate max-w-[180px]">
              {user?.compound || 'CHPS Compound'}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1">
          {!online && (
            <div className="pill bg-ghana-red/15 text-ghana-red mr-1">
              <WifiOff className="w-3 h-3" /> Offline
            </div>
          )}
          <button
            onClick={toggle}
            className="p-2.5 rounded-full hover:bg-bg-secondary transition"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-ghana-gold" />
            ) : (
              <Moon className="w-5 h-5 text-fg" />
            )}
          </button>
          <button
            onClick={() => nav('/notifications')}
            className="relative p-2.5 rounded-full hover:bg-bg-secondary transition"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-fg" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-ghana-red text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-bg">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
