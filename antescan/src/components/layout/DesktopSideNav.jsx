import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Users, Stethoscope, BarChart3, MoreHorizontal, Bell, Trophy, Send, LogOut, Sun, Moon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'

const NAV = [
  { to: '/home', label: 'Home', icon: Home, end: true },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/screen', label: 'New Screening', icon: Stethoscope, accent: true },
  { to: '/referrals', label: 'Referrals', icon: Send },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/more', label: 'More', icon: MoreHorizontal },
]

export default function DesktopSideNav() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const nav = useNavigate()
  const initials = (user?.name || 'CHW').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <aside className="hidden lg:flex w-64 shrink-0 sticky top-0 h-screen flex-col bg-bg-card border-r border-border">
      <div className="px-5 py-5 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-ghana-gold flex items-center justify-center font-display font-extrabold text-black">A</div>
        <div>
          <div className="font-display font-bold leading-tight">AnteScan</div>
          <div className="text-[10px] uppercase tracking-widest text-ghana-gold font-bold">CHW Portal</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto pretty-scroll px-3 py-4 space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition relative ${
                  isActive
                    ? 'bg-ghana-gold/15 text-ghana-gold'
                    : item.accent
                    ? 'bg-ghana-gold text-black hover:brightness-105'
                    : 'text-fg-secondary hover:bg-bg-secondary hover:text-fg'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && !item.accent && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-ghana-gold" />
                  )}
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ghana-gold to-amber-500 flex items-center justify-center text-black font-bold text-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{user?.name || 'CHW'}</div>
            <div className="text-[10px] uppercase tracking-wider text-ghana-gold font-bold truncate">
              {user?.badge || 'Bronze'} · {user?.totalScreenings ?? 0} screenings
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={toggle} className="flex-1 btn-outline py-2 text-xs flex items-center justify-center gap-1.5">
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={() => { logout(); nav('/login') }}
            className="flex-1 btn-outline py-2 text-xs flex items-center justify-center gap-1.5 hover:text-ghana-red hover:border-ghana-red"
          >
            <LogOut className="w-3.5 h-3.5" /> Log out
          </button>
        </div>
      </div>
    </aside>
  )
}
