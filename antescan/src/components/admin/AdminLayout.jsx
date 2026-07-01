import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Map, HeartPulse, Baby, Droplets, FileStack, Siren,
  Users, Trophy, Building2, Megaphone, Database, Bot, FlaskConical, LineChart,
  Bell, Download, Settings, UserCog, ScrollText, LogOut, Menu, X, Sun, Moon, Search,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { api } from '../../services/api.js'
import { onNotificationsChanged } from '../../context/ToastContext.jsx'
import Avatar from '../ui/Avatar.jsx'
import { motion, AnimatePresence } from 'framer-motion'

function AdminBellButton() {
  const nav = useNavigate()
  const [count, setCount] = useState(0)

  useEffect(() => {
    let alive = true
    const poll = async () => {
      try {
        const r = await api.notifications.unreadCount()
        if (alive) setCount(r.count || 0)
      } catch { /* ignore */ }
    }
    poll()
    const t = setInterval(poll, 10000)
    const off = onNotificationsChanged(poll)
    return () => { alive = false; clearInterval(t); off() }
  }, [])

  return (
    <button
      onClick={() => nav('/admin/notifications')}
      className="relative p-2 rounded-lg hover:bg-bg-secondary"
      aria-label={`${count} unread notifications`}>
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-ghana-red text-white text-[10px] font-bold flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

const NAV = [
  { group: 'Overview', items: [
    { to: '/admin', label: 'Main Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/map', label: 'National Map', icon: Map },
  ]},
  { group: 'Health Operations', items: [
    { to: '/admin/antenatal', label: 'Antenatal Reports', icon: HeartPulse },
    { to: '/admin/nutricheck', label: 'NutriCheck Reports', icon: Baby },
    { to: '/admin/sickle', label: 'Sickle Cell Reports', icon: Droplets },
    { to: '/admin/referrals', label: 'All Referrals', icon: FileStack },
    { to: '/admin/alerts', label: 'High Risk Alerts', icon: Siren },
  ]},
  { group: 'Community Health Workers', items: [
    { to: '/admin/chws', label: 'All CHWs', icon: Users },
    { to: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy },
    { to: '/admin/compounds', label: 'CHPS Compounds', icon: Building2 },
    { to: '/admin/broadcast', label: 'Broadcast Message', icon: Megaphone },
  ]},
  { group: 'Data & AI', items: [
    { to: '/admin/datasets', label: 'Dataset Manager', icon: Database },
    { to: '/admin/models', label: 'Model Manager', icon: Bot },
    { to: '/admin/training', label: 'Training Lab', icon: FlaskConical },
    { to: '/admin/performance', label: 'Model Performance', icon: LineChart },
  ]},
  { group: 'System', items: [
    { to: '/admin/notifications', label: 'Notifications', icon: Bell },
    { to: '/admin/exports', label: 'Export Center', icon: Download },
    { to: '/admin/settings', label: 'System Settings', icon: Settings },
    { to: '/admin/users', label: 'Admin Users', icon: UserCog },
    { to: '/admin/audit', label: 'Audit Log', icon: ScrollText },
  ]},
]

function SidebarContent({ onNavigate }) {
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()
  const nav = useNavigate()

  return (
    <div className="h-full flex flex-col bg-bg-card border-r border-border">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-ghana-gold flex items-center justify-center font-display font-extrabold text-black">
          A
        </div>
        <div>
          <div className="font-display font-bold leading-tight">AnteScan</div>
          <div className="text-[10px] uppercase tracking-widest text-ghana-gold font-bold">Admin Portal</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto pretty-scroll px-3 py-4 space-y-5">
        {NAV.map((group) => (
          <div key={group.group}>
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-fg-tertiary">
              {group.group}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition relative ${
                          isActive
                            ? 'bg-ghana-gold/15 text-ghana-gold'
                            : 'text-fg-secondary hover:bg-bg-secondary hover:text-fg'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-ghana-gold" />
                          )}
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <button onClick={() => { nav('/admin/profile'); onNavigate?.() }}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-bg-secondary transition text-left">
          <Avatar url={user?.avatarUrl} name={user?.name || 'Admin'} size={36}
            ringClass="border border-ghana-gold/40" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{user?.name || 'Admin'}</div>
            <div className="text-[10px] uppercase tracking-wider text-ghana-gold font-bold truncate">{user?.role} · Edit profile</div>
          </div>
        </button>
        <div className="flex gap-1">
          <button onClick={toggle} className="flex-1 btn-outline py-2 text-xs flex items-center justify-center gap-1.5">
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={() => { logout(); nav('/admin/login') }}
            className="flex-1 btn-outline py-2 text-xs flex items-center justify-center gap-1.5 hover:text-ghana-red hover:border-ghana-red"
          >
            <LogOut className="w-3.5 h-3.5" /> Log out
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen bg-bg-secondary flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/60"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85%]"
            >
              <SidebarContent onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top admin bar */}
        <header className="sticky top-0 z-20 bg-bg-card/90 backdrop-blur border-b border-border px-4 lg:px-8 py-3 flex items-center gap-3">
          <button onClick={() => setOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-bg-secondary">
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-fg-tertiary" />
            <input
              placeholder="Search patients, CHWs, datasets…"
              className="flex-1 bg-transparent border-0 focus:outline-none text-sm placeholder-fg-tertiary"
            />
          </div>
          <div className="flex-1 md:hidden font-display font-bold text-fg">Admin</div>
          <AdminBellButton />
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
