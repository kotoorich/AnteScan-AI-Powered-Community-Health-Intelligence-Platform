import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Camera, AlertTriangle, Loader2,
  Brain, Microscope, CheckCircle2, X, Search, UserPlus,
  Shield, Upload
} from 'lucide-react'
import { RiskScoreHero, LoadingSpinner } from '../components/ui/Primitives.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { usePatients } from '../data/hooks.js'
import { api } from '../services/api.js'
import { GHANA_REGIONS } from '../constants/hospitals.js'

// Camera and TFLite imports (optional, safe fallback)
let CameraCapture, analyzeBloodSmear, isTFLiteSupported
try {
  CameraCapture = require('../components/ui/CameraCapture.jsx').default
  const tflite = require('../services/tflite.js')
  analyzeBloodSmear = tflite.analyzeBloodSmear
  isTFLiteSupported = tflite.isTFLiteSupported
} catch {
  CameraCapture = null
  analyzeBloodSmear = null
  isTFLiteSupported = () => false
}

const SIGNS = [
  { key: 'joint_pain', label: 'Pain in joints / bones' },
  { key: 'jaundice', label: 'Yellow eyes (jaundice)' },
  { key: 'pale_palms', label: 'Pale palms / conjunctiva' },
  { key: 'dactylitis', label: 'Swollen hands/feet (dactylitis)' },
  { key: 'frequent_infections', label: 'Frequent infections' },
  { key: 'family_history', label: 'Family history of sickle cell' },
]

const PHENOTYPE_COLORS = {
  'AA': 'bg-success/15 text-success border-success/40',
  'AS': 'bg-ghana-gold/20 text-yellow-700 dark:text-ghana-gold border-ghana-gold/40',
  'SS': 'bg-ghana-red/20 text-ghana-red border-ghana-red/40',
  'SC': 'bg-orange-500/20 text-orange-500 border-orange-500/40',
  'AC': 'bg-purple-500/20 text-purple-500 border-purple-500/40',
}

export default function SickleCellScreen() {
  const nav = useNavigate()
  const toast = useToast()

  // Patient selection state
  const [step, setStep] = useState('select')
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [newPatient, setNewPatient] = useState({
    name: '', age: '', phone: '', village: '', region: '', district: ''
  })

  // Screening state
  const [signs, setSigns] = useState(new Set())
  const [imageData, setImageData] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [tfliteSupported, setTfliteSupported] = useState(true)

  const { data: patientsData } = usePatients({ module: 'Sickle Cell' })
  const sicklePatients = patientsData?.items || []
  const filtered = sicklePatients.filter((p) =>
    (p.fullName || p.name || '').toLowerCase().includes(query.toLowerCase())
  )

  // No toast warning - "Limited mode" badge already shows
  useEffect(() => {
    const supported = isTFLiteSupported ? isTFLiteSupported() : false
    setTfliteSupported(supported)
  }, [])

  const toggleSymptom = (key) => {
    const next = new Set(signs)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setSigns(next)
  }

  const handleImageCapture = useCallback(async (dataUrl) => {
    setImageData(dataUrl)
    setShowCamera(false)

    if (tfliteSupported && analyzeBloodSmear) {
      setAnalyzing(true)
      try {
        toast.info('Analyzing blood smear with AI...')
        const result = await analyzeBloodSmear(dataUrl)
        setAnalysis(result)
        toast.success(`Analysis complete: ${result.topPrediction.label}`)
      } catch (err) {
        toast.error('Analysis failed: ' + err.message)
        setAnalysis({
          topPrediction: {
            phenotype: 'AA',
            label: 'Normal (AA)',
            probability: 0.5,
            description: 'Unable to analyze image. Please consult with a lab.'
          },
          riskLevel: 'low',
          riskScore: 15,
          confidence: 0.3,
          allPredictions: [],
          imageQuality: { overall: 0.5, focusScore: 0.5, exposureScore: 0.5 },
        })
      } finally {
        setAnalyzing(false)
      }
    }
  }, [tfliteSupported, toast])

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target.result
      handleImageCapture(dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (!selected) return toast.error('Select a patient first')
    if (!imageData && signs.size === 0) return toast.error('Add image or select clinical signs')

    setSubmitting(true)
    try {
      const count = signs.size
      let baseScore = 18
      let baseLevel = 'low'
      let reasons = ['Clinical signs assessed']

      if (analysis) {
        baseScore = analysis.riskScore
        baseLevel = analysis.riskLevel
        reasons = [
          `AI analysis: ${analysis.topPrediction.label} (${Math.round(analysis.confidence * 100)}% confidence)`,
          ...reasons,
        ]
      }

      let score = baseScore
      let level = baseLevel

      if (count >= 4) {
        score = Math.max(score, 78)
        level = 'high'
        reasons.push('4+ clinical signs present')
      } else if (count >= 2) {
        score = Math.max(score, 52)
        if (level !== 'high' && level !== 'emergency') level = 'moderate'
        reasons.push('2-3 clinical signs present')
      } else {
        reasons.push('Few clinical signs observed')
      }

      if (analysis?.riskLevel === 'emergency' && score < 80) {
        score = 85
        level = 'emergency'
        reasons.push('AI analysis indicates emergency risk')
      }

      if (level === 'emergency' || level === 'high') {
        reasons.push('Refer for hemoglobin electrophoresis confirmation')
        reasons.push('Counsel family on sickle cell disease')
      }

      const payload = {
        module: 'Sickle Cell',
        clientUuid: crypto.randomUUID?.() || `c-${Date.now()}`,
        hasImage: !!imageData,
        clinicalSigns: Array.from(signs),
        symptoms: Array.from(signs).map(k => k.replace(/_/g, ' ')),
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
        score: Math.min(100, score),
        level,
        reasons,
        count,
        analysis,
        phenotype: analysis?.topPrediction?.phenotype || 'Unknown',
        phenotypeLabel: analysis?.topPrediction?.label || 'Unknown',
        confidence: analysis?.confidence || 0,
        screeningId: resp.screening?.id,
        patient: selected,
        patientId: resp.patientId,
      })
    } catch (err) {
      toast.error('Submit failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setResult(null)
    setSigns(new Set())
    setImageData(null)
    setAnalysis(null)
    setSelected(null)
    setStep('select')
  }

  // RESULT SCREEN
  if (result) {
    return (
      <div className="px-4 py-4 pb-8 space-y-4">
        <button onClick={reset} className="p-2 -ml-2 rounded-full hover:bg-bg-secondary">
          <ChevronLeft className="w-5 h-5" />
        </button>

        <RiskScoreHero score={result.score} risk={result.level}>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Microscope className="w-4 h-4 text-ghana-gold" />
              <span className="text-sm font-semibold">
                {result.phenotypeLabel}
              </span>
              {result.confidence > 0 && (
                <span className="text-xs text-fg-secondary">
                  ({Math.round(result.confidence * 100)}% confidence)
                </span>
              )}
            </div>
            {result.phenotype && result.phenotype !== 'Unknown' && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${PHENOTYPE_COLORS[result.phenotype] || ''}`}>
                {result.phenotype}
              </span>
            )}
          </div>
        </RiskScoreHero>

        {analysis && (
          <div className="card p-4 border-2 border-ghana-gold/30">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-ghana-gold" />
              <h3 className="font-display font-bold">AI Analysis Results</h3>
            </div>
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-fg-secondary">Confidence</span>
                <span className="font-bold">{Math.round((analysis.confidence || 0) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden mt-1">
                <div className="h-full bg-ghana-gold rounded-full transition-all duration-500"
                  style={{ width: `${(analysis.confidence || 0) * 100}%` }} />
              </div>
            </div>
            {analysis.allPredictions?.length > 0 && (
              <div className="space-y-1.5">
                {analysis.allPredictions.map((pred, idx) => {
                  const colorClass = PHENOTYPE_COLORS[pred.phenotype] || ''
                  const color = colorClass.split(' ')[0] || 'bg-gray-500'
                  return (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${color}`} />
                        <span>{pred.label}</span>
                      </div>
                      <span className="font-mono text-xs">{Math.round(pred.probability * 100)}%</span>
                    </div>
                  )
                })}
              </div>
            )}
            {analysis.imageQuality && (
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-3 text-xs text-fg-secondary">
                <span>Focus: {Math.round(analysis.imageQuality.focusScore * 100)}%</span>
                <span>Exposure: {Math.round(analysis.imageQuality.exposureScore * 100)}%</span>
                <span className={`font-bold ${analysis.imageQuality.overall > 0.6 ? 'text-success' : 'text-ghana-gold'}`}>
                  Overall: {Math.round(analysis.imageQuality.overall * 100)}%
                </span>
              </div>
            )}
          </div>
        )}

        {result.count > 0 && (
          <div className="card p-4">
            <h3 className="font-display font-bold mb-2">Clinical Signs ({result.count})</h3>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(signs).map((key) => {
                const sign = SIGNS.find(s => s.key === key)
                return sign ? (
                  <span key={key} className="text-xs px-2 py-1 bg-bg-secondary rounded-full">
                    {sign.label}
                  </span>
                ) : null
              })}
            </div>
          </div>
        )}

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-ghana-gold" />
            <h3 className="font-display font-bold">Clinical Reasoning</h3>
          </div>
          <ul className="space-y-2">
            {result.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-ghana-gold mt-1">•</span>
                <span className="text-fg-secondary">{r}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <button onClick={() => nav('/home')} className="btn-gold w-full flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Save & Go Home
          </button>
          <button onClick={reset} className="btn-outline w-full">Start New Screening</button>
        </div>
      </div>
    )
  }

  // PATIENT SELECTION STEP
  if (step === 'select') {
    return (
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => nav('/screen')} className="p-2 -ml-2 rounded-full hover:bg-bg-secondary">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-extrabold">Sickle Cell — Select Patient</h1>
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

  // FORM STEP
  return (
    <div className="px-4 py-4 pb-8 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setStep('select')} className="p-2 -ml-2 rounded-full hover:bg-bg-secondary">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="font-display text-lg font-bold leading-tight">{selected?.name || 'Patient'}</div>
          <div className="text-xs text-fg-secondary">Sickle Cell Screening</div>
        </div>
      </div>

      {selected?.isNew && (
        <div className="card p-4 space-y-3 border-2 border-ghana-gold/40">
          <h3 className="font-display font-bold">New Patient Details</h3>
          <p className="text-xs text-fg-secondary">Please fill in the patient's information</p>
          <div>
            <label className="label">Full Name *</label>
            <input
              className="input"
              placeholder="e.g. Kwame Asante"
              value={newPatient.name}
              onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
            />
          </div>
          <div>
            <label className="label">Age *</label>
            <input
              className="input"
              type="number"
              placeholder="e.g. 5"
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

      {/* Image Capture */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm">Blood Smear Analysis</h3>
          {!tfliteSupported && <span className="text-xs text-ghana-gold">Limited mode</span>}
        </div>

        {!imageData ? (
          <div className="flex gap-2">
            {CameraCapture ? (
              <button
                onClick={() => setShowCamera(true)}
                className="flex-1 card p-4 flex flex-col items-center gap-2 hover:border-ghana-gold/40 transition"
              >
                <Camera className="w-8 h-8 text-ghana-gold" />
                <span className="text-sm font-semibold">Open Camera</span>
                <span className="text-xs text-fg-secondary">Capture blood smear</span>
              </button>
            ) : (
              <button
                onClick={() => toast.info('Camera component not available yet. Please upload image.')}
                className="flex-1 card p-4 flex flex-col items-center gap-2 hover:border-ghana-gold/40 transition opacity-60"
              >
                <Camera className="w-8 h-8 text-fg-tertiary" />
                <span className="text-sm font-semibold">Camera (Phase 2)</span>
                <span className="text-xs text-fg-secondary">Coming soon</span>
              </button>
            )}
            <label
              htmlFor="sickle-upload"
              className="flex-1 card p-4 flex flex-col items-center gap-2 hover:border-ghana-gold/40 transition cursor-pointer"
            >
              <Upload className="w-8 h-8 text-ghana-gold" />
              <span className="text-sm font-semibold">Upload Image</span>
              <span className="text-xs text-fg-secondary">From gallery</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="sickle-upload"
            />
          </div>
        ) : (
          <div className="card p-3 flex items-center gap-3">
            <div className="w-20 h-20 rounded-lg bg-bg-secondary overflow-hidden flex-shrink-0">
              <img src={imageData} alt="Blood smear" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Image captured</div>
              {analyzing ? (
                <div className="flex items-center gap-2 text-xs text-ghana-gold">
                  <Loader2 className="w-3 h-3 animate-spin" /> Analyzing...
                </div>
              ) : analysis ? (
                <div className="text-xs text-success">Analysis complete ✓</div>
              ) : (
                <div className="text-xs text-fg-secondary">Ready for submission</div>
              )}
            </div>
            <button
              onClick={() => { setImageData(null); setAnalysis(null) }}
              className="p-2 rounded-full hover:bg-bg-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Clinical Signs */}
      <section className="card p-4 space-y-3">
        <h3 className="font-display font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-ghana-gold" /> Clinical Signs Observed
          <span className="text-xs font-normal text-fg-secondary">(tap to select)</span>
        </h3>
        <div className="space-y-2">
          {SIGNS.map((s) => {
            const on = signs.has(s.key)
            return (
              <motion.button
                key={s.key}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleSymptom(s.key)}
                className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition ${
                  on ? 'bg-ghana-gold/15 border-ghana-gold/40' : 'bg-bg-secondary border-border'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  on ? 'bg-ghana-gold border-ghana-gold' : 'border-border'
                }`}>
                  {on && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                </div>
                <span className="text-sm">{s.label}</span>
              </motion.button>
            )
          })}
        </div>
        {signs.size > 0 && (
          <div className="text-xs text-fg-secondary mt-1">
            {signs.size} sign{signs.size !== 1 ? 's' : ''} selected
          </div>
        )}
      </section>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="btn-gold w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {submitting ? (
          <><LoadingSpinner size="sm" /> Submitting...</>
        ) : (
          <><Brain className="w-4 h-4" /> Submit Screening</>
        )}
      </button>

      {/* Camera Modal */}
      {CameraCapture && (
        <AnimatePresence>
          {showCamera && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              onClick={() => setShowCamera(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <CameraCapture
                  onCapture={handleImageCapture}
                  onClose={() => setShowCamera(false)}
                  mode="analysis"
                  autoAnalyze={true}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}