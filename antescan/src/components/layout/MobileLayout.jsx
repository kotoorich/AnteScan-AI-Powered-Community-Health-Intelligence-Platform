import { Outlet, useLocation } from 'react-router-dom'
import TopHeader from './TopHeader.jsx'
import BottomNav from './BottomNav.jsx'
import DesktopSideNav from './DesktopSideNav.jsx'
import FloatingHelp from '../ui/FloatingHelp.jsx'

/**
 * Responsive CHW shell.
 *  - <lg : MTN-style mobile view (the look the user loves)
 *  - >=lg : full-width desktop app with left sidebar, no phone framing
 */
export default function MobileLayout() {
  const location = useLocation()
  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* DESKTOP shell ≥ lg : sidebar + content (true desktop layout) */}
      <div className="hidden lg:flex min-h-screen">
        <DesktopSideNav />
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Desktop top bar with breadcrumb-style title */}
          <header className="sticky top-0 z-20 bg-bg-card/90 backdrop-blur border-b border-border px-8 py-3.5 flex items-center gap-4">
            <div className="font-display text-lg font-bold">
              {titleFromPath(location.pathname)}
            </div>
            <div className="flex-1" />
            <div className="text-[11px] uppercase tracking-widest text-fg-tertiary">
              CHW Portal · Ghana Health Service
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* MOBILE shell < lg : MTN-style phone view (the one the user loves) */}
      <div className="lg:hidden">
        <TopHeader />
        <main className="pb-24 pt-2">
          <Outlet />
        </main>
        <BottomNav />
        <FloatingHelp />
      </div>
    </div>
  )
}

function titleFromPath(path) {
  if (path.startsWith('/home')) return 'Home'
  if (path.startsWith('/patients')) return 'Patients'
  if (path.startsWith('/screen/antenatal')) return 'Antenatal Screening'
  if (path.startsWith('/screen/nutricheck')) return 'NutriCheck Screening'
  if (path.startsWith('/screen/sickle')) return 'Sickle Cell Screening'
  if (path.startsWith('/screen')) return 'New Screening'
  if (path.startsWith('/referrals')) return 'Referrals'
  if (path.startsWith('/reports')) return 'Reports'
  if (path.startsWith('/leaderboard')) return 'Leaderboard'
  if (path.startsWith('/notifications')) return 'Notifications'
  if (path.startsWith('/more')) return 'More'
  return 'AnteScan'
}
