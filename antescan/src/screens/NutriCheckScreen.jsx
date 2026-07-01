import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Camera, Ruler, Search, UserPlus } from 'lucide-react'
import VoiceInput from '../components/ui/VoiceInput.jsx'
import { LoadingSpinner, RiskScoreHero } from '../components/ui/Primitives.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { usePatients } from '../data/hooks.js'
import { api } from '../services/api.js'
import { GHANA_REGIONS } from '../constants/hospitals.js'

function muacClass(mm) {
  const v = +mm
  if (!v) return { label: '—', color: 'fg-tertiary', risk: 'low' }
  if (v < 115) return { label: 'SAM — Severe Acute Malnutrition', color: 'ghana-red', risk: 'emergency' }
  if (v < 125) return { label: 'MAM — Moderate Acute Malnutrition', color: 'ghana-gold', risk: 'high' }
  return { label: 'Normal nutrition', color: 'success', risk: 'low' }
}

function whzScore(weight, height) {
  if (!weight || !height) return null
  const ratio = weight / (height / 100)
  return ((ratio - 5.2) / 0.6).toFixed(1)
}

export default function NutriCheckScreen() {
  const nav = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState('select')
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    childName: '', age_months: '', sex: 'F',
    weight: '', height: '', muac: '', oedema: 'No',
    breastfeeding: 'Yes', meals: '3', diarrhea: 'No',
  })
  const [done, setDone] = useState(false)
  const [result, setResult] = useState(null)

  // New patient with region/district
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: '',
    phone: '',
    village: '',
    region: '',
    district: '',
  })

  const { data: patientsData } = usePatients({ module: 'NutriCheck' })
  const nutriPatients = patientsData?.items || []
  const filtered = nutriPatients.filter((p) =>
    (p.fullName || p.name || '').toLowerCase().includes(query.toLowerCase())
  )

  const setF = (k, v) => setForm({ ...form, [k]: v })
  const cls = muacClass(form.muac)
  const z = whzScore(form.weight, form.height)

  const submit = async () => {
    if (!form.muac) return toast.error('Enter MUAC measurement')
    if (!selected) return toast.error('Select a patient first')

    setSubmitting(true)
    try {
      const payload = {
        module: 'NutriCheck',
        clientUuid: crypto.randomUUID?.() || `c-${Date.now()}`,
        anthropometry: {
          muac: +form.muac || null,
          oedema: form.oedema === 'Yes',
          weight: +form.weight || null,
          height: +form.height || null,
        },
        feeding: {
          breastfeeding: form.breastfeeding === 'Yes',
          meals: +form.meals || null,
          diarrhea: form.diarrhea === 'Yes',
        },
        child: {
          ageMonths: +form.age_months || null,
          sex: form.sex,
        },
        symptoms: [],
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

      setResult({
        score: resp.result.score,
        level: resp.result.level,
        reasons: resp.result.reasons,
        cls: cls,
        z: z,
        screeningId: resp.screening?.id,
        patient: selected,
        patientId: resp.patientId,
      })
      setDone(true)

    } catch (err) {
      toast.error('Submit failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (done && result) {
    return (
      <div className="px-4 py-4 pb-8 space-y-4">
        <button onClick={() => { setDone(false); setResult(null) }} className="p-2 -ml-2 rounded-full hover:bg-bg-secondary">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <RiskScoreHero score={result.score} risk={result.level}>
          <div className="mt-4 text-sm font-semibold">{result.cls.label}</div>
          {result.z && <div className="mt-2 text-xs">Weight-for-height Z: <span className="font-mono">{result.z}</span></div>}
        </RiskScoreHero>
        <div className="card p-4">
          <h3 className="font-display font-bold mb-2">Recommended Action</h3>
          <ul className="space-y-1.5">
            {result.reasons.map((r, i) => (
              <li key={i} className="text-sm text-fg-secondary flex items-start gap-2">
                <span className="text-ghana-gold mt-0.5">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
        <button onClick={() => nav('/home')} className="btn-gold w-full">Save & Go Home</button>
      </div>
    )
  }

  if (step === 'select') {
    return (
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => nav('/screen')} className="p-2 -ml-2 rounded-full hover:bg-bg-secondary">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-extrabold">NutriCheck — Select Patient</h1>
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
    <div className="px-4 py-4 pb-8 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setStep('select')} className="p-2 -ml-2 rounded-full hover:bg-bg-secondary">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="font-display text-lg font-bold leading-tight">{selected?.name || 'Patient'}</div>
          <div className="text-xs text-fg-secondary">NutriCheck Screening</div>
        </div>
      </div>

      <VoiceInput onMatch={() => {}} />

      {selected?.isNew && (
        <div className="card p-4 space-y-3 border-2 border-ghana-gold/40">
          <h3 className="font-display font-bold">New Patient Details</h3>
          <p className="text-xs text-fg-secondary">Please fill in the patient's information</p>
          <div>
            <label className="label">Full Name *</label>
            <input
              className="input"
              placeholder="e.g. Akua Mensah"
              value={newPatient.name}
              onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
            />
          </div>
          <div>
            <label className="label">Age *</label>
            <input
              className="input"
              type="number"
              placeholder="e.g. 2"
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

      <section className="card p-4 space-y-3">
        <h3 className="font-display font-bold flex items-center gap-2">
          <span className="w-1 h-4 bg-ghana-gold rounded" /> Child Info
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Child name</label>
            <input className="input" value={form.childName} onChange={(e) => setF('childName', e.target.value)} />
          </div>
          <div>
            <label className="label">Age (months)</label>
            <input className="input" type="number" value={form.age_months} onChange={(e) => setF('age_months', e.target.value)} />
          </div>
          <div>
            <label className="label">Sex</label>
            <select className="input" value={form.sex} onChange={(e) => setF('sex', e.target.value)}>
              <option value="F">Female</option>
              <option value="M">Male</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h3 className="font-display font-bold flex items-center gap-2">
          <span className="w-1 h-4 bg-ghana-red rounded" /> Anthropometry
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Weight (kg)</label>
            <input className="input" type="number" inputMode="decimal" value={form.weight} onChange={(e) => setF('weight', e.target.value)} />
          </div>
          <div>
            <label className="label">Height (cm)</label>
            <input className="input" type="number" inputMode="decimal" value={form.height} onChange={(e) => setF('height', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label flex items-center gap-2"><Ruler className="w-4 h-4" /> MUAC (mm) *</label>
          <input
            className={`input border-2 ${
              form.muac && cls.color === 'ghana-red' ? 'border-ghana-red' :
              form.muac && cls.color === 'ghana-gold' ? 'border-ghana-gold' :
              form.muac && cls.color === 'success' ? 'border-success' : ''
            }`}
            type="number"
            inputMode="numeric"
            value={form.muac}
            onChange={(e) => setF('muac', e.target.value)}
          />
          {form.muac && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className={`mt-2 text-sm font-semibold text-${cls.color}`}>
              ● {cls.label}
            </motion.div>
          )}
        </div>

        <div>
          <label className="label">Bilateral oedema</label>
          <div className="flex gap-2">
            {['No', 'Yes'].map((v) => (
              <button key={v} type="button"
                onClick={() => setF('oedema', v)}
                className={`flex-1 py-2 rounded-xl border font-semibold ${
                  form.oedema === v ? 'bg-ghana-gold text-black border-ghana-gold' : 'bg-bg-secondary border-border'
                }`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h3 className="font-display font-bold flex items-center gap-2">
          <span className="w-1 h-4 bg-ghana-green rounded" /> Feeding & Symptoms
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Breastfeeding</label>
            <select className="input" value={form.breastfeeding} onChange={(e) => setF('breastfeeding', e.target.value)}>
              <option>Yes</option><option>No</option>
            </select>
          </div>
          <div>
            <label className="label">Meals per day</label>
            <input className="input" type="number" value={form.meals} onChange={(e) => setF('meals', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Diarrhoea last 2 weeks</label>
            <select className="input" value={form.diarrhea} onChange={(e) => setF('diarrhea', e.target.value)}>
              <option>No</option><option>Yes</option>
            </select>
          </div>
        </div>
      </section>

      <button onClick={() => toast.info('Camera capture (Phase 2: TFLite)')} className="btn-outline w-full flex items-center justify-center gap-2">
        <Camera className="w-4 h-4" /> Take Photo of Child
      </button>

      <button onClick={submit} disabled={submitting} className="btn-gold w-full py-4 flex items-center justify-center gap-2">
        {submitting ? <><LoadingSpinner size="sm" /> Classifying…</> : 'Submit & Classify'}
      </button>
    </div>
  )
}