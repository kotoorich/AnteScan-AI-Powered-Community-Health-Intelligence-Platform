import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Droplets, Loader2 } from 'lucide-react'
import { useSickleReport } from '../data/hooks.js'

const COLORS = ['#00A651', '#FCD116', '#CE1126']

export default function AdminSickleReports() {
  const { data, loading, error } = useSickleReport()

  // FIXED: Read data directly from API response
  const totalScreened = data?.totalScreened || 0
  const highRisk = data?.highRisk || 0
  const confirmedPositive = data?.confirmedPositive || 0
  const awaitingLab = data?.awaitingLab || 0

  // Build result distribution from available data
  let results = []
  if (totalScreened > 0) {
    const normal = Math.max(0, totalScreened - highRisk - confirmedPositive)
    const trait = Math.max(0, data?.sickleTrait || 0)
    const disease = confirmedPositive || highRisk || 0

    results = [
      { name: 'Normal', value: normal || 1, color: '#00A651' },
      { name: 'Sickle Trait', value: trait || 0, color: '#FCD116' },
      { name: 'Sickle Disease', value: disease || 0, color: '#CE1126' },
    ]
  }

  const ageBins = data?.ageBins || []

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-ghana-gold mb-1">Health Operations</div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
          <Droplets className="w-7 h-7 text-ghana-green" /> Sickle Cell Reports
        </h1>
        <p className="text-sm text-fg-secondary">
          {loading ? 'Loading...' : `${totalScreened.toLocaleString()} screenings`}
        </p>
      </div>

      {loading ? (
        <div className="card-elevated bg-bg-card p-12 flex justify-center text-fg-secondary">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="card-elevated bg-bg-card p-8 text-center text-ghana-red">
          Could not load report data.
        </div>
      ) : totalScreened === 0 ? (
        <div className="card-elevated bg-bg-card p-12 text-center text-fg-secondary">
          <Droplets className="w-12 h-12 mx-auto mb-3 text-fg-tertiary" />
          <div className="font-bold text-fg">No sickle cell screenings yet</div>
          <div className="text-xs mt-1">Results will appear here once CHWs perform sickle cell screenings.</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Screened', value: totalScreened.toLocaleString(), accent: 'text-ghana-gold' },
              { label: 'High Risk', value: highRisk.toLocaleString(), accent: 'text-ghana-red' },
              { label: 'Confirmed Positive', value: confirmedPositive.toLocaleString(), accent: 'text-ghana-red' },
              { label: 'Awaiting Lab', value: awaitingLab.toLocaleString(), accent: 'text-yellow-500' },
            ].map((k) => (
              <div key={k.label} className="card-elevated bg-bg-card p-4">
                <div className="text-[10px] uppercase tracking-wider text-fg-tertiary font-bold">{k.label}</div>
                <div className={`text-2xl font-display font-extrabold mt-1 ${k.accent}`}>{k.value}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="card-elevated bg-bg-card p-5">
              <h3 className="font-display font-bold mb-3">Result distribution</h3>
              {results.length > 0 && results.some(r => r.value > 0) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={results} dataKey="value" innerRadius={50} outerRadius={90} paddingAngle={2}>
                      {results.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color || COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-fg-tertiary text-center py-8">
                  No result data available yet.
                </div>
              )}
              {results.length > 0 && (
                <div className="space-y-1 mt-3">
                  {results.map((r) => (
                    <div key={r.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ background: r.color }} />
                        <span>{r.name}</span>
                      </div>
                      <span className="font-bold">{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card-elevated bg-bg-card p-5">
              <h3 className="font-display font-bold mb-3">Screenings by age</h3>
              {ageBins.length === 0 ? (
                <div className="text-sm text-fg-tertiary text-center py-8">
                  Age distribution data will appear here once screenings are recorded.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={ageBins}>
                    <CartesianGrid stroke="rgba(127,127,127,0.15)" />
                    <XAxis dataKey="age" stroke="rgba(127,127,127,0.6)" fontSize={11} />
                    <YAxis stroke="rgba(127,127,127,0.6)" fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#00A651" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}