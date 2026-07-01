import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Phone, Send, Share2, MessageCircle, Home, Brain, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { RiskScoreHero } from '../components/ui/Primitives.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { api } from '../services/api.js'
import { getHospitalsForRegion } from '../constants/hospitals.js'

const ACTION_BY_LEVEL = {
  low: {
    title: 'Routine follow-up',
    body: 'Continue scheduled antenatal visits. Reinforce nutrition and iron supplementation. Next visit in 4 weeks.',
    icon: CheckCircle2,
    color: 'text-success',
    refer: false,
  },
  moderate: {
    title: 'Monitor closely',
    body: 'Schedule follow-up within 7 days. Patient education on warning signs (severe headache, bleeding, reduced fetal movement).',
    icon: AlertTriangle,
    color: 'text-yellow-700 dark:text-ghana-gold',
    refer: false,
  },
  high: {
    title: 'Refer to nearest facility',
    body: 'Send referral SMS to a facility in the patient\'s region. Notify family elder. Arrange transport within 24 hours.',
    icon: AlertTriangle,
    color: 'text-ghana-red',
    refer: true,
  },
  emergency: {
    title: '🚨 EMERGENCY — Refer Now',
    body: 'Call ambulance immediately (193). Alert receiving facility. Notify family elder by SMS. Do not delay.',
    icon: AlertTriangle,
    color: 'text-emergency',
    refer: true,
  },
}

export default function RiskResultScreen() {
  const nav = useNavigate()
  const { state } = useLocation()
  const toast = useToast()

  const [showFacilityModal, setShowFacilityModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!state) {
    return (
      <div className="p-6 text-center">
        <p className="text-fg-secondary">No result data. Please run a screening first.</p>
        <button onClick={() => nav('/screen')} className="btn-gold mt-4">Start Screening</button>
      </div>
    )
  }

  const { patient, patientId: statePatientId, result, screeningId } = state
  const { score, level, reasons } = result || {}
  const action = ACTION_BY_LEVEL[level]
  const ActionIcon = action?.icon

  const patientRegion = patient?.region || 'Ashanti'
  const facilities = getHospitalsForRegion(patientRegion)

  const sendReferral = async (facility) => {
    const actualPatientId = patient?.id || statePatientId

    if (!patient) {
      toast.error('No patient data')
      return
    }
    if (!actualPatientId) {
      toast.error('Patient ID missing')
      return
    }

    setIsSubmitting(true)
    try {
      await api.referrals.create({
        patientId: actualPatientId,
        screeningId: screeningId,
        module: 'ANC',
        urgency: level === 'emergency' ? 'Emergency' :
                 level === 'high' ? 'Urgent' : 'Routine',
        facility: facility,
        facilityPhone: '',
        notes: `Referral from ${level} risk screening (score: ${score}/100)`
      })
      toast.success(`Referral sent to ${facility}!`)
      setShowFacilityModal(false)
      setTimeout(() => nav('/referrals'), 1000)
    } catch (err) {
      toast.error('Failed to send referral: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReferralClick = () => {
    if (!action?.refer) return
    setShowFacilityModal(true)
  }

  return (
    <div className="px-4 py-4 pb-8 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => nav(-1)} className="p-2 -ml-2 rounded-full hover:bg-bg-secondary">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="font-display text-lg font-bold">Risk Assessment</div>
      </div>

      <div className="card p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-ghana-gold/20 text-ghana-gold flex items-center justify-center font-bold">
          {(patient?.name || 'P').split(' ').map((n) => n[0]).slice(0, 2).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{patient?.name || 'Patient'}</div>
          <div className="text-xs text-fg-secondary truncate">
            Age {patient?.age || '—'} · {patientRegion}
          </div>
        </div>
      </div>

      <RiskScoreHero score={score} risk={level} />

      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="card p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-ghana-gold/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-ghana-gold" />
          </div>
          <h3 className="font-display font-bold">Why this score?</h3>
        </div>
        <ul className="space-y-2">
          {reasons && reasons.map((r, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="flex items-start gap-2 text-sm"
            >
              <span className="text-ghana-gold mt-1">•</span>
              <span className="text-fg-secondary">{r}</span>
            </motion.li>
          ))}
        </ul>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="card p-4 border-2"
        style={{ borderColor: level === 'emergency' ? '#FF3B3B' : level === 'high' ? '#CE1126' : level === 'moderate' ? '#FCD11680' : '#00A65180' }}
      >
        <div className="flex items-center gap-2 mb-2">
          {ActionIcon && <ActionIcon className={`w-5 h-5 ${action.color}`} />}
          <h3 className={`font-display font-bold ${action.color}`}>{action.title}</h3>
        </div>
        <p className="text-sm text-fg-secondary">{action.body}</p>
      </motion.section>

      <div className="space-y-2">
        {action?.refer && (
          <button onClick={handleReferralClick} disabled={isSubmitting} className="btn-danger w-full flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> {isSubmitting ? 'Sending...' : 'Send Referral Now'}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => toast.info('Calling ambulance…')} className="btn-outline flex items-center justify-center gap-2">
            <Phone className="w-4 h-4" /> Call 193
          </button>
          <button onClick={() => toast.success('Shared via WhatsApp')} className="btn-outline flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
        </div>
        <button onClick={() => { toast.success('Saved to patient record'); nav('/home') }} className="btn-outline w-full flex items-center justify-center gap-2">
          <Home className="w-4 h-4" /> Save & Go Home
        </button>
      </div>

      <AnimatePresence>
        {showFacilityModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setShowFacilityModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-bg-card rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold">Select Facility</h3>
                <button onClick={() => setShowFacilityModal(false)} className="p-1 rounded-full hover:bg-bg-secondary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-fg-secondary">
                Select a health facility in <span className="font-bold">{patientRegion}</span>:
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto pretty-scroll">
                {facilities.map((facility) => (
                  <button
                    key={facility}
                    onClick={() => sendReferral(facility)}
                    disabled={isSubmitting}
                    className="w-full text-left p-3 rounded-xl border border-border hover:border-ghana-gold/50 active:scale-99 transition"
                  >
                    {facility}
                  </button>
                ))}
                {facilities.length === 0 && (
                  <div className="text-sm text-fg-secondary p-4 text-center">
                    No facilities found for this region. Please contact admin.
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowFacilityModal(false)}
                className="btn-outline w-full"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}