import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Send, Loader2 } from 'lucide-react'
import { useToast } from '../context/ToastContext.jsx'
import { usePatient } from '../data/hooks.js'
import { api } from '../services/api.js'

export default function NewReferralScreen() {
  const { patientId } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { data: patient, loading: patientLoading } = usePatient(patientId)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    urgency: 'Routine',
    facility: '',
    facilityPhone: '',
    notes: '',
  })

  const setF = (k, v) => setForm({ ...form, [k]: v })

  const handleSubmit = async () => {
    if (!form.facility) return toast.error('Facility name is required')
    if (!patient) return toast.error('Patient not found')

    setSubmitting(true)
    try {
      await api.referrals.create({
        patientId: patient.id,
        module: patient.primary_module || 'ANC',
        urgency: form.urgency,
        facility: form.facility,
        facilityPhone: form.facilityPhone || '',
        notes: form.notes || '',
      })
      toast.success('Referral sent successfully!')
      nav('/referrals')
    } catch (err) {
      toast.error('Failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (patientLoading) {
    return (
      <div className="p-6 flex justify-center text-fg-secondary">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading patient…
      </div>
    )
  }

  return (
    <div className="px-4 py-4 pb-8 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => nav(-1)} className="p-2 -ml-2 rounded-full hover:bg-bg-secondary">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl font-extrabold">New Referral</h1>
      </div>

      <div className="card p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-ghana-gold/20 text-ghana-gold flex items-center justify-center font-bold">
          {(patient?.name || 'P').split(' ').map((n) => n[0]).slice(0, 2).join('')}
        </div>
        <div className="flex-1">
          <div className="font-semibold">{patient?.name || 'Patient'}</div>
          <div className="text-xs text-fg-secondary">Age {patient?.age || '—'} · {patient?.module || 'ANC'}</div>
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <div>
          <label className="label">Urgency *</label>
          <select className="input" value={form.urgency} onChange={(e) => setF('urgency', e.target.value)}>
            <option value="Routine">Routine</option>
            <option value="Urgent">Urgent</option>
            <option value="Emergency">Emergency</option>
          </select>
        </div>

        <div>
          <label className="label">Facility Name *</label>
          <input className="input" placeholder="e.g. Komfo Anokye Teaching Hospital" value={form.facility} onChange={(e) => setF('facility', e.target.value)} />
        </div>

        <div>
          <label className="label">Facility Phone</label>
          <input className="input" placeholder="e.g. 0245123456" value={form.facilityPhone} onChange={(e) => setF('facilityPhone', e.target.value)} />
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="input min-h-[80px]" placeholder="Additional information…" value={form.notes} onChange={(e) => setF('notes', e.target.value)} />
        </div>
      </div>

      <button onClick={handleSubmit} disabled={submitting} className="btn-gold w-full flex items-center justify-center gap-2">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {submitting ? 'Sending…' : 'Send Referral'}
      </button>
    </div>
  )
}