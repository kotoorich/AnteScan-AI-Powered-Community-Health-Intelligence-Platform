import { useNavigate } from 'react-router-dom'
import {
  Users, Stethoscope, AlertTriangle, Send, Activity, TrendingUp, TrendingDown,
  Database, BarChart3, Bell, Loader2, ArrowRight,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  useDashboardKpis, useTrend, useRiskDistribution, useReferralOutcomes,
} from '../data/hooks.js'

function KpiCard({ label, value, delta, icon, color = 'gold' }) {
  const colorMap = {
    gold: 'text-ghana-gold bg-ghana-gold/10',
    red: 'text-ghana-red bg-ghana-red/10',
    green: 'text-ghana-green bg-ghana-green/10',
    blue: 'text-blue-400 bg-blue-400/10',
  }
  return (
    <div className="card-elevated bg-bg-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${colorMap[color]} flex items-center justify-center`}>
          {icon}
        </div>
        {delta !== undefined && delta !== 0 && (
          <div className={`text-xs flex items-center gap-0.5 font-bold ${delta > 0 ? 'text-ghana-green' : 'text-ghana-red'}`}>
            {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      <div className="font-display text-2xl font-bold leading-tight">{value}</div>
      <div className="text-xs text-fg-secondary">{label}</div>
    </div>
  )
}

export default function AdminMainDashboard() {
  const nav = useNavigate()
  const { data: kpis, loading: kpisLoading } = useDashboardKpis()
  const { data: trend, loading: trendLoading } = useTrend(30)
  const { data: risks, loading: risksLoading } = useRiskDistribution()
  const { data: referralOut, loading: referralLoading } = useReferralOutcomes()

  const loading = kpisLoading || trendLoading || risksLoading || referralLoading

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        <p className="text-sm text-fg-secondary">
          Live data from {kpis?.activeChws ?? 0} CHWs across Ghana
        </p>
      </div>

      {loading && (
        <div className="card-elevated bg-bg-card p-4 flex items-center gap-2 text-fg-secondary text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading live data…
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Patients" value={kpis?.totalPatients ?? 0}
          delta={kpis?.weeklyDelta?.totalPatients}
          icon={<Users className="w-5 h-5" />} color="gold" />
        <KpiCard label="Screenings (7d)" value={kpis?.weeklyScreenings ?? 0}
          delta={kpis?.weeklyDelta?.weeklyScreenings}
          icon={<Stethoscope className="w-5 h-5" />} color="green" />
        <KpiCard label="High Risk (7d)" value={kpis?.weeklyHighRisk ?? 0}
          delta={kpis?.weeklyDelta?.weeklyHighRisk}
          icon={<AlertTriangle className="w-5 h-5" />} color="red" />
        <KpiCard label="Referrals (7d)" value={kpis?.weeklyReferrals ?? 0}
          delta={kpis?.weeklyDelta?.weeklyReferrals}
          icon={<Send className="w-5 h-5" />} color="blue" />
        <KpiCard label="Active CHWs" value={kpis?.activeChws ?? 0}
          icon={<Activity className="w-5 h-5" />} color="gold" />
        <KpiCard label="Avg Risk Score" value={kpis?.avgRiskScore ?? 0}
          icon={<BarChart3 className="w-5 h-5" />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-elevated bg-bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold">30-day Screening Trend</h3>
            <span className="text-[10px] uppercase tracking-wider text-fg-tertiary">Live</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend?.items || []}>
                <defs>
                  <linearGradient id="ancFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#CE1126" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#CE1126" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="nutriFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#006B3F" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#006B3F" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#888" fontSize={10} />
                <YAxis stroke="#888" fontSize={10} />
                <Tooltip contentStyle={{ background: '#1F1F1F', border: '1px solid #333', borderRadius: 8 }} />
                <Area type="monotone" dataKey="anc" stroke="#CE1126" fill="url(#ancFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="nutri" stroke="#006B3F" fill="url(#nutriFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="sickle" stroke="#FCD116" fillOpacity={0} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elevated bg-bg-card p-4">
          <h3 className="font-display font-bold mb-3">Risk Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={risks?.items || []} dataKey="value" nameKey="name"
                     cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {(risks?.items || []).map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1F1F1F', border: '1px solid #333', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs mt-1">
            {(risks?.items || []).map((r) => (
              <div key={r.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                <span className="flex-1 text-fg-secondary">{r.name}</span>
                <span className="font-bold">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ShortcutCard icon={<Database />} label="Dataset Manager"
          subtitle="View real DHS / MICS6 data"
          onClick={() => nav('/admin/datasets')} />
        <ShortcutCard icon={<BarChart3 />} label="Training Lab"
          subtitle="Train models on real data"
          onClick={() => nav('/admin/training')} />
        <ShortcutCard icon={<Bell />} label="Active Alerts"
          subtitle="High-risk cases needing review"
          onClick={() => nav('/admin/alerts')} />
      </div>
    </div>
  )
}

function ShortcutCard({ icon, label, subtitle, onClick }) {
  return (
    <button onClick={onClick}
      className="card-elevated bg-bg-card p-4 text-left hover:border-ghana-gold/50 border border-transparent transition">
      <div className="w-10 h-10 rounded-lg bg-ghana-gold/10 text-ghana-gold flex items-center justify-center mb-3">
        {icon}
      </div>
      <div className="font-display font-bold flex items-center justify-between">
        {label} <ArrowRight className="w-4 h-4 text-fg-tertiary" />
      </div>
      <div className="text-xs text-fg-secondary">{subtitle}</div>
    </button>
  )
}
