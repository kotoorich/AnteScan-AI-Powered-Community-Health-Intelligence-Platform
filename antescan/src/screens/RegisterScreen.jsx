import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { LoadingSpinner } from '../components/ui/Primitives.jsx'
import { GHANA_REGIONS } from '../data/mockData.js'

export default function RegisterScreen() {
  const [form, setForm] = useState({
    fullName: '', chwId: '', phone: '', region: '', district: '', compound: '',
    password: '', confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const toast = useToast()
  const nav = useNavigate()

  const set = (k, v) => setForm({ ...form, [k]: v })

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (!/^0(20|24|50|54|55|59|26|56|27|57)\d{7}$/.test(form.phone))
        throw new Error('Invalid Ghana phone number')
      if (form.password.length < 6) throw new Error('Password must be at least 6 characters')
      if (form.password !== form.confirmPassword) throw new Error('Passwords do not match')
      await register(form)
      toast.success('Account created!')
      nav('/home', { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-fg flex justify-center px-6 py-8 safe-top safe-bottom">
      <div className="w-full max-w-md">
      <button onClick={() => nav(-1)} className="self-start p-2 -ml-2 rounded-full hover:bg-bg-secondary">
        <ChevronLeft className="w-5 h-5" />
      </button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 mt-2">
        <h1 className="font-display text-3xl font-extrabold">Register</h1>
        <p className="text-sm text-fg-secondary">Join Ghana's CHW intelligence network</p>
      </motion.div>

      <form onSubmit={submit} className="space-y-3 pb-8">
        <div>
          <label className="label">Full Name *</label>
          <input className="input" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required />
        </div>
        <div>
          <label className="label">CHW ID *</label>
          <input className="input" value={form.chwId} onChange={(e) => set('chwId', e.target.value)} placeholder="GHS-CHW-XXXXX" required />
        </div>
        <div>
          <label className="label">Phone *</label>
          <input className="input" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="024xxxxxxx" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Region *</label>
            <select className="input" value={form.region} onChange={(e) => set('region', e.target.value)} required>
              <option value="">Select…</option>
              {GHANA_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">District *</label>
            <input className="input" value={form.district} onChange={(e) => set('district', e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="label">CHPS Compound *</label>
          <input className="input" value={form.compound} onChange={(e) => set('compound', e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Password *</label>
            <input className="input" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required />
          </div>
          <div>
            <label className="label">Confirm *</label>
            <input className="input" type="password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} required />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-gold w-full mt-4 flex items-center justify-center gap-2">
          {loading ? <LoadingSpinner size="sm" /> : 'Create Account'}
        </button>
        <Link to="/login" className="block text-center text-sm text-fg-secondary mt-2">
          Already have an account? <span className="text-ghana-gold font-semibold">Login</span>
        </Link>
      </form>
      </div>
    </div>
  )
}
