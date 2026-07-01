import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { LineChart as LineChartIcon, Loader2 } from 'lucide-react'
import { useModelPerformance } from '../data/hooks.js'

export default function AdminPerformance() {
  const { data, loading } = useModelPerformance()

  const overTime = data?.overTime || []
  const radar = data?.radar || []
  const deployedModels = data?.deployedModels || []

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-ghana-gold mb-1">Data & AI</div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
          <LineChartIcon className="w-7 h-7 text-ghana-gold" /> Model Performance
        </h1>
        <p className="text-sm text-fg-secondary">Track AI accuracy, precision and recall over time</p>
      </div>

      {loading ? (
        <div className="card-elevated bg-bg-card p-12 flex justify-center text-fg-secondary">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          {deployedModels.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {deployedModels.map((m) => (
                <div key={m.id} className="card-elevated bg-bg-card p-4">
                  <div className="text-[10px] uppercase tracking-wider text-fg-tertiary font-bold">{m.module}</div>
                  <div className="font-display font-bold mt-1">{m.name}</div>
                  <div className="text-xs text-fg-secondary mt-1">v{m.version} · deployed</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-fg-tertiary">Accuracy</span> <span className="font-bold">{((m.accuracy || 0) * 100).toFixed(1)}%</span></div>
                    <div><span className="text-fg-tertiary">F1</span> <span className="font-bold">{((m.f1 || 0) * 100).toFixed(1)}%</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card-elevated bg-bg-card p-5">
              <h3 className="font-display font-bold mb-1">Model performance over time</h3>
              <p className="text-xs text-fg-secondary mb-3">Last training runs</p>
              {overTime.length === 0 ? (
                <div className="text-sm text-fg-tertiary text-center py-10">
                  No training history yet. Use the Training Lab to train and deploy models.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={overTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                    <XAxis dataKey="week" stroke="#888" fontSize={11} />
                    <YAxis domain={[0, 1]} stroke="#888" fontSize={11} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="accuracy" stroke="#FCD116" strokeWidth={2} />
                    <Line type="monotone" dataKey="precision" stroke="#CE1126" strokeWidth={2} />
                    <Line type="monotone" dataKey="recall" stroke="#00A651" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card-elevated bg-bg-card p-5">
              <h3 className="font-display font-bold mb-1">Per-module comparison</h3>
              <p className="text-xs text-fg-secondary mb-3">Metrics across modules</p>
              {radar.length === 0 ? (
                <div className="text-sm text-fg-tertiary text-center py-10">
                  Comparison appears here when at least one model per module is deployed.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radar}>
                    <PolarGrid stroke="rgba(150,150,150,0.2)" />
                    <PolarAngleAxis dataKey="metric" stroke="#888" fontSize={11} />
                    <PolarRadiusAxis stroke="#888" fontSize={10} />
                    <Radar dataKey="anc" stroke="#CE1126" fill="#CE1126" fillOpacity={0.3} />
                    <Radar dataKey="nutri" stroke="#FCD116" fill="#FCD116" fillOpacity={0.3} />
                    <Radar dataKey="sickle" stroke="#00A651" fill="#00A651" fillOpacity={0.3} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
