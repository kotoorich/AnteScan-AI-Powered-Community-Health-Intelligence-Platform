import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Activity, Baby, Droplets, Send, Trophy, Award, ArrowRight, RefreshCw, Loader2 } from 'lucide-react'
import BannerCarousel from '../components/ui/BannerCarousel.jsx'
import { StatCard, PatientCard } from '../components/ui/Primitives.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { usePatients, useDashboardKpis } from '../data/hooks.js'

export default function HomeScreen() {
  const nav = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const { data: patientsData, loading: patientsLoading, refetch: refetchPatients } =
    usePatients({ per_page: 5 })
  const { data: kpis, loading: kpisLoading, refetch: refetchKpis } = useDashboardKpis()

  const recent = patientsData?.items || []
  const stats = kpis || {}
  const loading = patientsLoading || kpisLoading

  const refresh = () => {
    refetchPatients()
    refetchKpis()
    toast?.success?.('Refreshing live data…')
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Today's banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="mx-4 lg:mx-0 mt-2 card-elevated bg-bg-card p-4 flex items-center gap-3"
      >
        <div className="w-11 h-11 rounded-full bg-ghana-gold/15 flex items-center justify-center">
          <Award className="w-5 h-5 text-ghana-gold" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-fg-secondary">This Week's Screenings</div>
          <div className="font-display text-2xl font-bold leading-tight">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (stats.weeklyScreenings ?? 0)}
          </div>
        </div>
        <button onClick={refresh}
          className="px-3 py-1.5 rounded-full bg-ghana-gold text-black text-xs font-bold flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </motion.div>

      <div className="px-4 lg:px-0">
        <BannerCarousel />
      </div>

      {/* KPI grid — `icon` is a component REFERENCE (no <>) */}
      <div className="px-4 lg:px-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Active CHWs"    value={stats.activeChws ?? 0}      icon={Activity}  accent="View"
          onClick={() => nav('/leaderboard')} />
        <StatCard title="Patients"       value={stats.totalPatients ?? 0}   icon={Baby}      accent="Open"
          onClick={() => nav('/patients')} />
        <StatCard title="High Risk (7d)" value={stats.weeklyHighRisk ?? 0}  icon={Droplets}  accent="Review"
          onClick={() => nav('/referrals')} />
        <StatCard title="Referrals (7d)" value={stats.weeklyReferrals ?? 0} icon={Send}      accent="Track"
          onClick={() => nav('/referrals')} />
      </div>

      {/* Quick actions */}
      <div className="px-4 lg:px-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button onClick={() => nav('/screen')}
          className="card-elevated bg-ghana-gold text-black p-4 flex flex-col gap-2 hover:brightness-105">
          <Activity className="w-5 h-5" />
          <div className="font-bold">New Screening</div>
          <div className="text-xs">ANC · NutriCheck · Sickle</div>
        </button>
        <button onClick={() => nav('/patients')}
          className="card-elevated bg-bg-card p-4 flex flex-col gap-2">
          <Baby className="w-5 h-5 text-ghana-red" />
          <div className="font-bold">My Patients</div>
          <div className="text-xs text-fg-secondary">View register</div>
        </button>
        <button onClick={() => nav('/referrals')}
          className="card-elevated bg-bg-card p-4 flex flex-col gap-2">
          <Send className="w-5 h-5 text-ghana-green" />
          <div className="font-bold">Referrals</div>
          <div className="text-xs text-fg-secondary">Track outcomes</div>
        </button>
        <button onClick={() => nav('/leaderboard')}
          className="card-elevated bg-bg-card p-4 flex flex-col gap-2">
          <Trophy className="w-5 h-5 text-ghana-gold" />
          <div className="font-bold">Leaderboard</div>
          <div className="text-xs text-fg-secondary">Your rank</div>
        </button>
      </div>

      {/* Recent patients */}
      <div className="px-4 lg:px-0 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold">Recent Patients</h3>
          <button onClick={() => nav('/patients')}
            className="text-xs text-ghana-gold font-bold flex items-center gap-1">
            See all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {loading ? (
          <div className="card-elevated bg-bg-card p-6 flex items-center justify-center gap-2 text-fg-secondary">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading patients from API…
          </div>
        ) : recent.length === 0 ? (
          <div className="card-elevated bg-bg-card p-6 text-center text-fg-secondary text-sm">
            No patients yet. Tap <span className="font-bold">New Screening</span> to register your first.
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((p) => (
              <PatientCard key={p.id} patient={p} onClick={() => nav(`/patients/${p.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
