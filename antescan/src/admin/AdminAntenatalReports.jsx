import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { HeartPulse, Loader2 } from 'lucide-react'
import { useAntenatalReport, useTrend } from '../data/hooks.js'

export default function AdminAntenatalReports() {
  const { data, loading } = useAntenatalReport()
  const { data: trendData } = useTrend(30)

  // Read data directly from API response (no "kpis" wrapper)
  const totalScreenings = data?.totalScreenings || 0
  const highRisk = data?.highRiskIdentified || 0
  const topSymptoms = data?.topSymptoms || []
  const trend = trendData?.items || []

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-ghana-gold mb-1">Health Operations</div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
          <HeartPulse className="w-7 h-7 text-ghana-red" /> Antenatal Reports
        </h1>
        <p className="text-sm text-fg-secondary">Pregnancy risk screening insights across all districts</p>
      </div>

      {loading ? (
        <div className="card-elevated bg-bg-card p-12 flex justify-center text-fg-secondary">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'ANC Screenings (30d)', value: totalScreenings.toLocaleString() },
              { label: 'High-Risk Identified', value: highRisk.toLocaleString() },
              { label: 'Pre-eclampsia Cases', value: data?.preEclampsia || 0 },
              { label: 'Pregnant Women Tracked', value: data?.pregnantWomen || 0 },
            ].map((k) => (
              <div key={k.label} className="card-elevated bg-bg-card p-4">
                <div className="text-[10px] uppercase tracking-wider text-fg-tertiary font-bold">{k.label}</div>
                <div className="text-2xl font-display font-extrabold mt-1">{k.value}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="card-elevated bg-bg-card p-5">
              <h3 className="font-display font-bold mb-3">Top reported symptoms</h3>
              {topSymptoms.length === 0 ? (
                <div className="text-sm text-fg-tertiary text-center py-8">
                  No symptom data yet. As CHWs screen patients, common symptoms will appear here.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topSymptoms} layout="vertical">
                    <CartesianGrid stroke="rgba(127,127,127,0.15)" />
                    <XAxis type="number" stroke="rgba(127,127,127,0.6)" fontSize={11} />
                    <YAxis dataKey="symptom" type="category" width={120} stroke="rgba(127,127,127,0.6)" fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#CE1126" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card-elevated bg-bg-card p-5">
              <h3 className="font-display font-bold mb-3">ANC screening trend (30d)</h3>
              {trend.length === 0 ? (
                <div className="text-sm text-fg-tertiary text-center py-8">
                  No screenings recorded in the last 30 days.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trend}>
                    <CartesianGrid stroke="rgba(127,127,127,0.15)" />
                    <XAxis dataKey="date" stroke="rgba(127,127,127,0.6)" fontSize={11} />
                    <YAxis stroke="rgba(127,127,127,0.6)" fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="anc" stroke="#CE1126" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}