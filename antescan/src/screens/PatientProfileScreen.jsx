import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, MapPin, Calendar, Activity, Send, FlaskConical, Loader2 } from 'lucide-react'
import { usePatient, usePatientTimeline } from '../data/hooks.js'
import { RiskBadge } from '../components/ui/Primitives.jsx'

export default function PatientProfileScreen() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: patient, loading } = usePatient(id)
  const { data: timeline } = usePatientTimeline(id)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center gap-2 text-fg-secondary">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading patient…
      </div>
    )
  }
  if (!patient) {
    return (
      <div className="p-6 text-center text-fg-secondary">
        Patient not found.
        <button onClick={() => nav(-1)} className="block mx-auto mt-3 text-ghana-gold underline">Back</button>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6 p-4 lg:p-0">
      <button onClick={() => nav(-1)} className="flex items-center gap-1.5 text-sm text-fg-secondary">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="card-elevated bg-bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-ghana-red to-red-700 flex items-center justify-center text-white font-bold text-lg">
            {patient.name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold">{patient.name}</h2>
            <div className="text-sm text-fg-secondary">
              {patient.age}yr · {patient.sex} · {patient.module}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-fg-secondary">
              {patient.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {patient.phone}</span>}
              {patient.village && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {patient.village}</span>}
              {patient.lastVisit && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(patient.lastVisit).toLocaleDateString()}</span>}
            </div>
          </div>
          {patient.risk && <RiskBadge level={patient.risk} score={patient.riskScore} />}
        </div>

        {/* New Referral Button */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-border">
          <button 
            onClick={() => nav(`/referral/new/${patient.id}`)} 
            className="btn-gold flex-1 flex items-center justify-center gap-2 text-sm"
          >
            <Send className="w-4 h-4" /> Refer Patient
          </button>
        </div>

        {patient.elderName && (
          <div className="mt-3 pt-3 border-t border-border text-xs">
            <span className="text-fg-tertiary uppercase tracking-wider">Grandmother Network:</span>{' '}
            <span className="font-bold">{patient.elderName}</span>{' '}
            <span className="text-fg-secondary">{patient.elderPhone}</span>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-display font-bold mb-2 px-1">Timeline</h3>
        {(!timeline?.events || timeline.events.length === 0) ? (
          <div className="card-elevated bg-bg-card p-4 text-center text-sm text-fg-secondary">
            No history yet. Submit a screening to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {timeline.events.map((e, i) => {
              const Icon = e.kind === 'screening' ? Activity : e.kind === 'referral' ? Send : FlaskConical
              return (
                <div key={i} className="card-elevated bg-bg-card p-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-ghana-gold/10 text-ghana-gold flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{e.title}</div>
                    <div className="text-xs text-fg-secondary">{e.detail}</div>
                    <div className="text-[10px] text-fg-tertiary mt-0.5">
                      {new Date(e.when).toLocaleString()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}