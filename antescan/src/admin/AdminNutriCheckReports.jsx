import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Baby, Loader2 } from 'lucide-react'
import { useNutricheckReport } from '../data/hooks.js'

export default function AdminNutriCheckReports() {
  const { data, loading } = useNutricheckReport()

  // FIXED: Read data directly from API response (no "kpis" wrapper)
  const totalScreenings = data?.totalScreenings || 0
  const sam = data?.samCases || 0
  const mam = data?.mamCases || 0
  const normal = data?.normalCases || 0
  const muacHist = data?.muacDistribution || []
  const trend = data?.trend || []

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-ghana-gold mb-1">Health Operations</div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
          <Baby className="w-7 h-7 text-ghana-gold" /> NutriCheck Reports
        </h1>
        <p className="text-sm text-fg-secondary">
          {loading ? 'Loading...' : `${totalScreenings.toLocaleString()} children screened`}
        </p>
      </div>

      {loading ? (
        <div className="card-elevated bg-bg-card p-12 flex justify-center text-fg-secondary">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Children Screened', value: totalScreenings.toLocaleString(), accent: 'text-ghana-gold' },
              { label: 'SAM Cases', value: sam.toLocaleString(), accent: 'text-ghana-red' },
              { label: 'MAM Cases', value: mam.toLocaleString(), accent: 'text-yellow-500' },
              { label: 'Normal', value: normal.toLocaleString(), accent: 'text-success' },
            ].map((k) => (
              <div key={k.label} className="card-elevated bg-bg-card p-4">
                <div className="text-[10px] uppercase tracking-wider text-fg-tertiary font-bold">{k.label}</div>
                <div className={`text-2xl font-display font-extrabold mt-1 ${k.accent}`}>{k.value}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="card-elevated bg-bg-card p-5">
              <h3 className="font-display font-bold mb-3">MUAC distribution (mm)</h3>
              {muacHist.length === 0 ? (
                <div className="text-sm text-fg-tertiary text-center py-8">
                  No nutrition screenings yet. CHWs need to screen children.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={muacHist}>
                    <CartesianGrid stroke="rgba(127,127,127,0.15)" />
                    <XAxis dataKey="range" stroke="rgba(127,127,127,0.6)" fontSize={11} />
                    <YAxis stroke="rgba(127,127,127,0.6)" fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#FCD116" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card-elevated bg-bg-card p-5">
              <h3 className="font-display font-bold mb-3">Classification over time</h3>
              {trend.length === 0 ? (
                <div className="text-sm text-fg-tertiary text-center py-8">
                  Trend data appears once children have been screened.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={trend}>
                    <CartesianGrid stroke="rgba(127,127,127,0.15)" />
                    <XAxis dataKey="day" stroke="rgba(127,127,127,0.6)" fontSize={11} />
                    <YAxis stroke="rgba(127,127,127,0.6)" fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="normal" stackId="1" stroke="#00A651" fill="#00A65133" />
                    <Area type="monotone" dataKey="mam" stackId="1" stroke="#FCD116" fill="#FCD11633" />
                    <Area type="monotone" dataKey="sam" stackId="1" stroke="#CE1126" fill="#CE112633" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}