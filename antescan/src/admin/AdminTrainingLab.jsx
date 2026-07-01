import { useState, useEffect } from 'react'
import { FlaskConical, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useToast } from '../context/ToastContext.jsx'
import { api } from '../services/api.js'
import { useDatasets } from '../data/hooks.js'

const STEPS = ['Module', 'Dataset', 'Hyperparameters', 'Train']
const MODULES = ['ANC', 'NutriCheck', 'SickleCell']

export default function AdminTrainingLab() {
  const [step, setStep] = useState(0)
  const [module, setModule] = useState('ANC')
  const [datasetId, setDatasetId] = useState('')
  const [params, setParams] = useState({ algorithm: 'random_forest', test_size: 0.2, n_estimators: 100, max_depth: 12 })
  const [jobId, setJobId] = useState(null)
  const [training, setTraining] = useState(false)
  const [done, setDone] = useState(null)
  const toast = useToast()
  const { data: datasetsData } = useDatasets()
  const datasets = datasetsData?.items || []

  // Poll training status
  useEffect(() => {
    if (!jobId || !training) return
    const t = setInterval(async () => {
      try {
        const r = await api.training.status(jobId)
        if (r.status === 'completed') {
          setTraining(false)
          setDone(r.metrics || {})
          toast.success('Model trained successfully')
          clearInterval(t)
        } else if (r.status === 'failed') {
          setTraining(false)
          toast.error(r.error || 'Training failed')
          clearInterval(t)
        }
      } catch (err) { /* keep polling */ }
    }, 2000)
    return () => clearInterval(t)
  }, [jobId, training, toast])

  const runTraining = async () => {
    if (!datasetId) return toast.error('Select a dataset')
    setTraining(true); setDone(null)
    try {
      const r = await api.training.start({
        module, dataset_id: datasetId,
        algorithm: params.algorithm,
        test_size: params.test_size,
        n_estimators: params.n_estimators,
        max_depth: params.max_depth,
      })
      setJobId(r.job_id || r.jobId)
      toast.success('Training started')
    } catch (err) {
      setTraining(false)
      toast.error(err.message || 'Could not start training')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-ghana-gold mb-1">Data & AI</div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
          <FlaskConical className="w-7 h-7 text-ghana-gold" /> Training Lab
        </h1>
        <p className="text-sm text-fg-secondary">Train new AI models step-by-step on real datasets</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              i < step ? 'bg-success text-white' : i === step ? 'bg-ghana-gold text-black' : 'bg-bg-secondary text-fg-tertiary'
            }`}>
              {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <div className={`text-sm ${i === step ? 'font-bold' : 'text-fg-secondary'}`}>{s}</div>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-fg-tertiary" />}
          </div>
        ))}
      </div>

      <div className="card-elevated bg-bg-card p-6">
        {step === 0 && (
          <div className="space-y-3">
            <div className="font-display font-bold">Choose module</div>
            <div className="grid grid-cols-3 gap-2">
              {MODULES.map((m) => (
                <button key={m} onClick={() => setModule(m)}
                  className={`py-3 rounded-xl border-2 font-bold ${
                    module === m ? 'border-ghana-gold bg-ghana-gold/10' : 'border-border text-fg-secondary'
                  }`}>{m}</button>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="btn-gold w-full mt-3">Continue</button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div className="font-display font-bold">Select dataset</div>
            {datasets.length === 0 ? (
              <div className="text-sm text-fg-tertiary py-6 text-center">
                No datasets available. Upload one in the Dataset Manager first.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {datasets.map((d) => (
                  <button key={d.id} onClick={() => setDatasetId(d.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 ${
                      datasetId === d.id ? 'border-ghana-gold bg-ghana-gold/10' : 'border-border'
                    }`}>
                    <div className="font-semibold">{d.name}</div>
                    <div className="text-xs text-fg-secondary">
                      {(d.rows || 0).toLocaleString()} rows · {d.columns || 0} cols · {d.status}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button onClick={() => setStep(0)} className="btn-outline flex-1">Back</button>
              <button onClick={() => setStep(2)} disabled={!datasetId} className="btn-gold flex-1 disabled:opacity-50">Continue</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="font-display font-bold">Hyperparameters</div>
            <label className="block text-sm">
              Algorithm
              <select className="input mt-1" value={params.algorithm}
                onChange={(e) => setParams({ ...params, algorithm: e.target.value })}>
                <option value="random_forest">Random Forest</option>
                <option value="gradient_boosting">Gradient Boosting</option>
                <option value="logistic_regression">Logistic Regression</option>
              </select>
            </label>
            <label className="block text-sm">
              Test size
              <input className="input mt-1" type="number" step="0.05" min="0.1" max="0.4"
                value={params.test_size}
                onChange={(e) => setParams({ ...params, test_size: parseFloat(e.target.value) })} />
            </label>
            <label className="block text-sm">
              n_estimators
              <input className="input mt-1" type="number" min="10" max="500"
                value={params.n_estimators}
                onChange={(e) => setParams({ ...params, n_estimators: parseInt(e.target.value) })} />
            </label>
            <label className="block text-sm">
              max_depth
              <input className="input mt-1" type="number" min="2" max="32"
                value={params.max_depth}
                onChange={(e) => setParams({ ...params, max_depth: parseInt(e.target.value) })} />
            </label>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setStep(1)} className="btn-outline flex-1">Back</button>
              <button onClick={() => setStep(3)} className="btn-gold flex-1">Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="font-display font-bold">Review & train</div>
            <div className="text-sm space-y-1 bg-bg-secondary p-4 rounded-xl">
              <div><b>Module:</b> {module}</div>
              <div><b>Dataset:</b> {datasets.find((d) => d.id === datasetId)?.name}</div>
              <div><b>Algorithm:</b> {params.algorithm}</div>
              <div><b>Test size:</b> {params.test_size}</div>
              <div><b>Trees / depth:</b> {params.n_estimators} / {params.max_depth}</div>
            </div>

            {!training && !done && (
              <button onClick={runTraining} className="btn-gold w-full flex items-center justify-center gap-2">
                <FlaskConical className="w-4 h-4" /> Start training
              </button>
            )}

            {training && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-6 text-fg-secondary flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Training in progress…
              </motion.div>
            )}

            {done && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-2">
                <div className="text-success font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Training complete
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Metric label="Accuracy" value={done.accuracy} />
                  <Metric label="Precision" value={done.precision} />
                  <Metric label="Recall" value={done.recall} />
                  <Metric label="F1" value={done.f1} />
                </div>
                <button onClick={() => { setStep(0); setDone(null); setJobId(null) }}
                  className="btn-outline w-full">Train another</button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="bg-bg-secondary p-3 rounded-lg">
      <div className="text-[10px] uppercase tracking-wider text-fg-tertiary font-bold">{label}</div>
      <div className="text-xl font-display font-bold">{value != null ? (value * 100).toFixed(1) + '%' : '—'}</div>
    </div>
  )
}
