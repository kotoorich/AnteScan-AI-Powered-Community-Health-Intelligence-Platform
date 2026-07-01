import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Search, UserPlus, X, Loader2 } from 'lucide-react'
import VoiceInput from '../components/ui/VoiceInput.jsx'
import { LoadingSpinner } from '../components/ui/Primitives.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { usePatients } from '../data/hooks.js'
import { api } from '../services/api.js'
import { GHANA_REGIONS } from '../constants/hospitals.js' // import regions

const SYMPTOMS = [
  { key: 'headache', label: 'Headache' },
  { key: 'blurred_vision', label: 'Blurred vision' },
  { key: 'swelling', label: 'Swelling of face/hands/feet' },
  { key: 'abdominal_pain', label: 'Abdominal pain' },
  { key: 'bleeding', label: 'Vaginal bleeding' },
  { key: 'reduced_fetal_movement', label: 'Reduced fetal movement' },
  { key: 'fever', label: 'Fever' },
  { key: 'vomiting', label: 'Vomiting' },
  { key: 'breathing', label: 'Difficulty breathing' },
  { key: 'convulsions', label: 'Convulsions' },
]

function computeRisk(form, symptoms) {
  // Rule-based fallback (mirrors backend ruleset)
  let score = 0
  const reasons = []
  const bps = +form.bp_systolic, bpd = +form.bp_diastolic
  if (bps >= 160 || bpd >= 110) { score += 40; reasons.push(`Severe hypertension (${bps}/${bpd}) — pre-eclampsia risk`) }
  else if (bps >= 140 || bpd >= 90) { score += 22; reasons.push(`Elevated BP (${bps}/${bpd})`) }
  if (symptoms.has('headache') && symptoms.has('blurred_vision')) {
    score += 25; reasons.push('Headache + blurred vision combination suggests pre-eclampsia')
  }
  if (symptoms.has('bleeding')) { score += 22; reasons.push('Vaginal bleeding reported — urgent evaluation needed') }
  if (symptoms.has('convulsions')) { score += 50; reasons.push('Convulsions reported — possible eclampsia') }
  if (symptoms.has('reduced_fetal_movement')) { score += 18; reasons.push('Reduced fetal movement — assess foetal well-being') }
  if (symptoms.has('swelling')) { score += 8 }
  if (symptoms.has('fever') && +form.temperature >= 38.5) { score += 12; reasons.push(`Fever (${form.temperature}°C) — possible infection`) }
  const fhr = +form.fetal_hr
  if (fhr && (fhr < 110 || fhr > 160)) { score += 15; reasons.push(`Abnormal fetal heart rate (${fhr} bpm)`) }
  if (+form.gestational_age < 18 && +form.gravida >= 5) { score += 8; reasons.push('High parity at young gestation') }
  if (reasons.length === 0) reasons.push('All measured vitals within safe range', 'No concerning symptoms reported', 'Continue routine antenatal monitoring')

  score = Math.min(100, score)
  const level = score >= 80 ? 'emergency' : score >= 60 ? 'high' : score >= 35 ? 'moderate' : 'low'
  return { score, level, reasons }
}

export default function AntenatalScreen() {
  const nav = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState('select') // select | form
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    bp_systolic: '', bp_diastolic: '', weight: '', height: '',
    temperature: '', pulse: '', gestational_age: '',
    fundal_height: '', fetal_hr: '', fetal_movement: 'Yes',
    presentation: 'Cephalic', parity: '', gravida: '',
  })
  const [symptoms, setSymptoms] = useState(new Set())

  // New patient state with region and district
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: '',
    phone: '',
    village: '',
    region: '',
    district: '',
  })

  const { data: patientsData } = usePatients({ module: 'ANC' })
  const ancPatients = patientsData?.items || []
  const filtered = ancPatients.filter((p) =>
    (p.fullName || p.name || '').toLowerCase().includes(query.toLowerCase())
  )

  const toggleSymptom = (k) => {
    const next = new Set(symptoms)
    next.has(k) ? next.delete(k) : next.add(k)
    setSymptoms(next)
  }

  const handleVoice = async (transcript) => {
    if (!transcript) return
    try {
      const result = await api.screenings.voiceMap(transcript)
      const next = new Set(symptoms)
      result.symptoms.forEach((m) => next.add(m))
      setSymptoms(next)
      toast.success(
        `${result.symptoms.length} symptom${result.symptoms.length !== 1 ? 's' : ''} from ${result.language} auto-filled`
      )
    } catch (e) {
      toast.error('Voice mapping failed: ' + e.message)
    }
  }

  const setF = (k, v) => setForm({ ...form, [k]: v })

  const bmi = form.weight && form.height ? (form.weight / Math.pow(form.height / 100, 2)).toFixed(1) : '—'

  const submit = async () => {
    if (!form.bp_systolic || !form.bp_diastolic) return toast.error('Enter blood pressure')
    if (!selected) return toast.error('Select a patient first')
    setSubmitting(true)
    try {
      const payload = {
        module: 'ANC',
        clientUuid: crypto.randomUUID?.() || `c-${Date.now()}`,
        vitals: {
          bp_systolic: +form.bp_systolic, bp_diastolic: +form.bp_diastolic,
          weight: +form.weight || null, height: +form.height || null,
          temperature: +form.temperature || null, pulse: +form.pulse || null,
        },
        obstetric: {
          gestational_age: +form.gestational_age || null,
          fundal_height: +form.fundal_height || null,
          fetal_hr: +form.fetal_hr || null,
          presentation: form.presentation,
          gravida: +form.gravida || null, parity: +form.parity || null,
        },
        symptoms: Array.from(symptoms),
      }

      if (selected.isNew) {
        if (!newPatient.name || !newPatient.age) {
          setSubmitting(false)
          return toast.error('Please enter patient name and age')
        }
        if (!newPatient.region) {
          setSubmitting(false)
          return toast.error('Please select region')
        }
        if (!newPatient.district) {
          setSubmitting(false)
          return toast.error('Please enter district')
        }
        payload.newPatient = {
          fullName: newPatient.name,
          age: parseInt(newPatient.age),
          phone: newPatient.phone || '',
          village: newPatient.village || '',
          region: newPatient.region,
          district: newPatient.district,
        }
      } else {
        payload.patientId = selected.id
      }

      const resp = await api.screenings.create(payload)

      nav('/screen/antenatal/result', {
        state: {
          patient: selected,
          patientId: resp.patientId,
          result: resp.result,
          form,
          symptoms: Array.from(symptoms),
          screeningId: resp.screening?.id,
        },
      })
    } catch (err) {
      toast.error('Submit failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'select') {
    return (
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => nav('/screen')} className="p-2 -ml-2 rounded-full hover:bg-bg-secondary">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-extrabold">Antenatal — Select Patient</h1>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-tertiary" />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or ID"
            className="input pl-10"
          />
        </div>

        <button
          onClick={() => {
            setNewPatient({ name: '', age: '', phone: '', village: '', region: '', district: '' })
            setSelected({ name: 'New Patient', age: '', isNew: true })
            setStep('form')
          }}
          className="btn-gold w-full mb-4 flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> New Patient
        </button>

        <div className="space-y-2">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => { setSelected(p); setStep('form') }}
              className="w-full text-left p-3 rounded-xl bg-bg-card border border-border hover:border-ghana-gold/40 active:scale-99"
            >
              <div className="font-semibold">{p.name}</div>
              <div className="text-xs text-fg-secondary">
                Age {p.age} · {p.village}
                {p.region && ` · ${p.region}`}
                {p.district && `, ${p.district}`}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // form
  return (
    <div className="pb-8">
      <div className="px-4 py-4 flex items-center gap-2">
        <button onClick={() => setStep('select')} className="p-2 -ml-2 rounded-full hover:bg-bg-secondary">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="font-display text-lg font-bold leading-tight">{selected?.name || 'Patient'}</div>
          <div className="text-xs text-fg-secondary">Antenatal Screening</div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <VoiceInput onMatch={handleVoice} />

        {/* New Patient Form with Region/District */}
        {selected?.isNew && (
          <div className="card p-4 space-y-3 border-2 border-ghana-gold/40">
            <h3 className="font-display font-bold">New Patient Details</h3>
            <p className="text-xs text-fg-secondary">Please fill in the patient's information</p>
            <div>
              <label className="label">Full Name *</label>
              <input
                className="input"
                placeholder="e.g. Abena Osei"
                value={newPatient.name}
                onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
              />
            </div>
            <div>
              <label className="label">Age *</label>
              <input
                className="input"
                type="number"
                placeholder="e.g. 28"
                value={newPatient.age}
                onChange={(e) => setNewPatient({...newPatient, age: e.target.value})}
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                placeholder="e.g. 0245123456"
                value={newPatient.phone}
                onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
              />
            </div>
            <div>
              <label className="label">Village</label>
              <input
                className="input"
                placeholder="e.g. Tafo"
                value={newPatient.village}
                onChange={(e) => setNewPatient({...newPatient, village: e.target.value})}
              />
            </div>
            <div>
              <label className="label">Region *</label>
              <select
                className="input"
                value={newPatient.region}
                onChange={(e) => setNewPatient({...newPatient, region: e.target.value})}
              >
                <option value="">Select Region</option>
                {GHANA_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">District *</label>
              <input
                className="input"
                placeholder="e.g. Kumasi Metro"
                value={newPatient.district}
                onChange={(e) => setNewPatient({...newPatient, district: e.target.value})}
              />
            </div>
          </div>
        )}

        {/* Vitals */}
        <section className="card p-4 space-y-3">
          <h3 className="font-display font-bold flex items-center gap-2">
            <span className="w-1 h-4 bg-ghana-red rounded" /> Vital Signs
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">BP Systolic</label>
              <input className="input" type="number" inputMode="numeric" placeholder="mmHg" value={form.bp_systolic} onChange={(e) => setF('bp_systolic', e.target.value)} />
            </div>
            <div>
              <label className="label">BP Diastolic</label>
              <input className="input" type="number" inputMode="numeric" placeholder="mmHg" value={form.bp_diastolic} onChange={(e) => setF('bp_diastolic', e.target.value)} />
            </div>
            <div>
              <label className="label">Weight</label>
              <input className="input" type="number" inputMode="decimal" placeholder="kg" value={form.weight} onChange={(e) => setF('weight', e.target.value)} />
            </div>
            <div>
              <label className="label">Height</label>
              <input className="input" type="number" inputMode="decimal" placeholder="cm" value={form.height} onChange={(e) => setF('height', e.target.value)} />
            </div>
            <div>
              <label className="label">Temperature</label>
              <input className="input" type="number" inputMode="decimal" placeholder="°C" value={form.temperature} onChange={(e) => setF('temperature', e.target.value)} />
            </div>
            <div>
              <label className="label">Pulse</label>
              <input className="input" type="number" inputMode="numeric" placeholder="bpm" value={form.pulse} onChange={(e) => setF('pulse', e.target.value)} />
            </div>
          </div>
          <div className="text-xs text-fg-secondary">
            BMI: <span className="font-mono font-bold text-fg">{bmi}</span>
          </div>
        </section>

        {/* Obstetric */}
        <section className="card p-4 space-y-3">
          <h3 className="font-display font-bold flex items-center gap-2">
            <span className="w-1 h-4 bg-ghana-gold rounded" /> Obstetric
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Gestational age (wk)</label>
              <input className="input" type="number" value={form.gestational_age} onChange={(e) => setF('gestational_age', e.target.value)} />
            </div>
            <div>
              <label className="label">Fundal height (cm)</label>
              <input className="input" type="number" value={form.fundal_height} onChange={(e) => setF('fundal_height', e.target.value)} />
            </div>
            <div>
              <label className="label">Fetal HR (bpm)</label>
              <input className="input" type="number" value={form.fetal_hr} onChange={(e) => setF('fetal_hr', e.target.value)} />
            </div>
            <div>
              <label className="label">Presentation</label>
              <select className="input" value={form.presentation} onChange={(e) => setF('presentation', e.target.value)}>
                <option>Cephalic</option><option>Breech</option><option>Transverse</option>
              </select>
            </div>
            <div>
              <label className="label">Gravida</label>
              <input className="input" type="number" value={form.gravida} onChange={(e) => setF('gravida', e.target.value)} />
            </div>
            <div>
              <label className="label">Parity</label>
              <input className="input" type="number" value={form.parity} onChange={(e) => setF('parity', e.target.value)} />
            </div>
          </div>
        </section>

        {/* Symptoms */}
        <section className="card p-4 space-y-3">
          <h3 className="font-display font-bold flex items-center gap-2">
            <span className="w-1 h-4 bg-ghana-green rounded" /> Symptoms <span className="text-xs font-normal text-fg-secondary">(tap to select)</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((s) => {
              const on = symptoms.has(s.key)
              return (
                <motion.button
                  key={s.key} whileTap={{ scale: 0.95 }}
                  onClick={() => toggleSymptom(s.key)}
                  className={`pill border transition ${
                    on ? 'bg-success/15 text-success border-success/40' : 'bg-bg-secondary border-border text-fg-secondary'
                  }`}
                >
                  {on && '🎙 '}{s.label}
                </motion.button>
              )
            })}
          </div>
        </section>

        <button
          onClick={submit}
          disabled={submitting}
          className="btn-gold w-full text-base py-4 flex items-center justify-center gap-2"
        >
          {submitting ? (<><LoadingSpinner size="sm" /> Calculating Risk…</>) : 'Submit & Calculate Risk'}
        </button>
      </div>
    </div>
  )
}