import { useNavigate } from 'react-router-dom'
import { User, Settings, Trophy, GraduationCap, Cloud, Info, LogOut, ChevronRight, Sun, Moon, Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import Avatar from '../components/ui/Avatar.jsx'

const SECTIONS = (nav, toast) => [
  {
    title: 'Account',
    items: [
      { icon: User, label: 'My Profile', onClick: () => nav('/profile') },
      { icon: Settings, label: 'Preferences', onClick: () => nav('/preferences') },
    ],
  },
  {
    title: 'Performance',
    items: [
      { icon: Trophy, label: 'Leaderboard', onClick: () => nav('/leaderboard') },
    ],
  },
  {
    title: 'System',
    items: [
      { icon: Cloud, label: 'Offline Sync', onClick: () => nav('/offline-sync') },
      { icon: Bell, label: 'Notifications', onClick: () => nav('/notifications') },
      { icon: Info, label: 'About AnteScan', onClick: () => nav('/about') },
    ],
  },
]

export default function MoreScreen() {
  const nav = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const toast = useToast()

  return (
    <div className="px-4 py-4 pb-8 space-y-4">
      <h1 className="font-display text-2xl font-extrabold">More</h1>

      {/* User card */}
      <div className="card p-5 text-center bg-gradient-to-br from-ghana-gold/15 to-bg-card">
        <div className="flex justify-center mb-3">
          <Avatar url={user?.avatarUrl} name={user?.name || 'CHW'} size={80}
            ringClass="border-2 border-ghana-gold shadow-gold-glow" />
        </div>
        <div className="font-display text-xl font-bold">{user?.name}</div>
        <div className="text-sm text-fg-secondary">{user?.chwId} · {user?.compound}</div>
        <div className="inline-flex items-center gap-1.5 mt-3 bg-bg-card border border-ghana-gold/30 text-ghana-gold text-xs font-bold px-3 py-1 rounded-full">
          🏅 {user?.badge} Badge · {user?.totalScreenings} screenings
        </div>
      </div>

      {/* Theme */}
      <button onClick={toggle} className="w-full card p-4 flex items-center gap-3 hover:border-ghana-gold/40">
        {theme === 'dark' ? <Sun className="w-5 h-5 text-ghana-gold" /> : <Moon className="w-5 h-5" />}
        <span className="flex-1 text-left font-semibold">Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
        <ChevronRight className="w-4 h-4 text-fg-tertiary" />
      </button>

      {/* Sections */}
      {SECTIONS(nav, toast).map((sec) => (
        <div key={sec.title}>
          <div className="text-xs font-bold uppercase tracking-widest text-fg-tertiary mb-1 px-1">{sec.title}</div>
          <div className="card divide-y divide-border">
            {sec.items.map((it) => {
              const Icon = it.icon
              return (
                <button key={it.label} onClick={it.onClick}
                  className="w-full flex items-center gap-3 p-4 hover:bg-bg-secondary text-left">
                  <Icon className="w-5 h-5 text-fg-secondary" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{it.label}</div>
                    {it.sub && <div className="text-xs text-fg-tertiary">{it.sub}</div>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-fg-tertiary" />
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <button onClick={() => { logout(); nav('/login') }}
        className="btn-outline w-full text-ghana-red border-ghana-red/40 hover:bg-ghana-red/10 flex items-center justify-center gap-2">
        <LogOut className="w-4 h-4" /> Log Out
      </button>

      <div className="text-center text-[10px] text-fg-tertiary pt-2">
        AnteScan v1.0 · Ghana AI Innovation Challenge 2026
      </div>
    </div>
  )
}
