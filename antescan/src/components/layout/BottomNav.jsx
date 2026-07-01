import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Users, BarChart3, MoreHorizontal, Stethoscope } from 'lucide-react'
import { motion } from 'framer-motion'

const TABS = [
  { key: 'home', label: 'Home', icon: Home, path: '/home' },
  { key: 'patients', label: 'Patients', icon: Users, path: '/patients' },
  { key: 'screen', label: 'Screen', icon: Stethoscope, path: '/screen', center: true },
  { key: 'reports', label: 'Reports', icon: BarChart3, path: '/reports' },
  { key: 'more', label: 'More', icon: MoreHorizontal, path: '/more' },
]

export default function BottomNav() {
  const loc = useLocation()
  const nav = useNavigate()
  const path = loc.pathname

  const isActive = (p) => path === p || (p !== '/home' && path.startsWith(p))

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-bg border-t border-border safe-bottom">
      <div className="relative max-w-md mx-auto h-16">
        <div className="grid grid-cols-5 h-full">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = isActive(tab.path)
            if (tab.center) {
              return (
                <div key={tab.key} className="flex items-end justify-center">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => nav(tab.path)}
                    className="relative -top-5 w-16 h-16 rounded-full bg-ghana-gold flex items-center justify-center raised-center"
                    aria-label="Open screening menu"
                  >
                    <Icon className="w-7 h-7 text-black" strokeWidth={2.4} />
                  </motion.button>
                </div>
              )
            }
            return (
              <button
                key={tab.key}
                onClick={() => nav(tab.path)}
                className="flex flex-col items-center justify-center gap-0.5 active:scale-95 transition"
              >
                <Icon className={`w-5 h-5 ${active ? 'text-ghana-gold' : 'text-fg-tertiary'}`} strokeWidth={active ? 2.4 : 2} />
                <span className={`text-[10px] font-semibold ${active ? 'text-ghana-gold' : 'text-fg-tertiary'}`}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
        {/* center cutout */}
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 w-20 h-10 bg-bg rounded-b-full" />
      </div>
    </nav>
  )
}
