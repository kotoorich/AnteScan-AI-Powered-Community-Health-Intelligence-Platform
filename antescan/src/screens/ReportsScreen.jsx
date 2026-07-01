import { BarChart3, Loader2 } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { useTrend, useRiskDistribution, useDashboardKpis } from '../data/hooks.js'

export default function ReportsScreen() {
  const { data: kpis, loading: kpisLoading } = useDashboardKpis()
  const { data: trend, loading: trendLoading } = useTrend(30)
  const { data: risks, loading: risksLoading } = useRiskDistribution()

  const loading = kpisLoading || trendLoading || risksLoading

  return (
    <div className="space-y-4 p-4 lg:p-0">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-ghana-gold" />
        <h2 className="font-display text-lg font-bold">Reports</h2>
      </div>

      {loading && (
        <div className="card-elevated bg-bg-card p-6 flex items-center justify-center gap-2 text-fg-secondary">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading live data...
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="card-elevated bg-bg-card p-3">
          <div className="text-xs text-fg-tertiary uppercase tracking-wider">Patients</div>
          <div className="font-display text-2xl font-bold">{kpis?.totalPatients ?? 0}</div>
        </div>
        <div className="card-elevated bg-bg-card p-3">
          <div className="text-xs text-fg-tertiary uppercase tracking-wider">Screenings (7d)</div>
          <div className="font-display text-2xl font-bold">{kpis?.weeklyScreenings ?? 0}</div>
        </div>
        <div className="card-elevated bg-bg-card p-3">
          <div className="text-xs text-fg-tertiary uppercase tracking-wider">High Risk</div>
          <div className="font-display text-2xl font-bold text-ghana-red">{kpis?.weeklyHighRisk ?? 0}</div>
        </div>
        <div className="card-elevated bg-bg-card p-3">
          <div className="text-xs text-fg-tertiary uppercase tracking-wider">Referrals</div>
          <div className="font-display text-2xl font-bold text-ghana-green">{kpis?.weeklyReferrals ?? 0}</div>
        </div>
      </div>

      <div className="card-elevated bg-bg-card p-3">
        <h3 className="font-display font-bold mb-2">30-day Screening Trend</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend?.items || []}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FCD116" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#FCD116" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#888" fontSize={10} />
              <YAxis stroke="#888" fontSize={10} />
              <Tooltip contentStyle={{ background: '#1F1F1F', border: '1px solid #333' }} />
              <Area type="monotone" dataKey="anc" stroke="#CE1126" fill="url(#g1)" />
              <Area type="monotone" dataKey="nutri" stroke="#006B3F" fillOpacity={0} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-elevated bg-bg-card p-3">
        <h3 className="font-display font-bold mb-2">Risk Distribution</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={risks?.items || []} dataKey="value" nameKey="name"
                   cx="50%" cy="50%" outerRadius={70}>
                {(risks?.items || []).map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1F1F1F', border: '1px solid #333' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}