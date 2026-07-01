import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { LoadingSpinner } from '../components/ui/Primitives.jsx'
import GhanaIllustration from '../components/ui/GhanaIllustration.jsx'

export default function LoginScreen() {
  const [chwId, setChwId] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { loginChw } = useAuth()
  const toast = useToast()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setErrors({})
    if (!chwId) return setErrors({ chwId: 'CHW ID required' })
    if (!password) return setErrors({ password: 'Password required' })
    setLoading(true)
    try {
      await loginChw(chwId.trim(), password)
      toast.success('Welcome back!')
      nav('/home', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-fg flex items-center justify-center px-6 py-10 safe-top safe-bottom">
      {/* Card width is capped so it never spans the whole desktop */}
      <div className="w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-2"
        >
          <div className="flex justify-center -mb-4">
            <GhanaIllustration size={180} />
          </div>
          <h1 className="font-display text-3xl font-extrabold">AnteScan</h1>
          <p className="text-sm text-fg-secondary">Community Health Intelligence · Ghana</p>
        </motion.div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-elevated p-6 bg-bg-card border border-border space-y-4"
        >
          <h2 className="font-display text-xl font-bold">Welcome Back</h2>

          <div>
            <label className="label">CHW ID</label>
            <input
              value={chwId}
              onChange={(e) => setChwId(e.target.value.toUpperCase())}
              placeholder="GHS-CHW-00100"
              className={`input ${errors.chwId ? 'border-ghana-red' : ''}`}
              autoCapitalize="characters"
              autoComplete="username"
            />
            {errors.chwId && <p className="text-xs text-ghana-red mt-1">{errors.chwId}</p>}
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`input pr-12 ${errors.password ? 'border-ghana-red' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-tertiary"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-ghana-red mt-1">{errors.password}</p>}
            <Link to="/forgot" className="text-xs text-ghana-gold font-semibold mt-1.5 inline-block">
              Forgot Password?
            </Link>
          </div>

          <button type="submit" disabled={loading} className="btn-gold w-full flex items-center justify-center gap-2">
            {loading ? <LoadingSpinner size="sm" /> : 'Login'}
          </button>

          {/* Demo credentials hint — useful for first-time setup */}
          <div className="bg-ghana-gold/5 border border-ghana-gold/20 rounded-lg p-3 text-xs">
            <div className="font-bold text-ghana-gold uppercase tracking-wider mb-1">Demo credentials</div>
            <div className="text-fg-secondary space-y-0.5 font-mono">
              <div>CHW ID: <span className="text-fg">GHS-CHW-00100</span></div>
              <div>Password: <span className="text-fg">changeme</span></div>
            </div>
          </div>

          <div className="text-center text-xs text-fg-tertiary">— or —</div>

          <Link to="/register" className="btn-outline w-full block text-center">
            Register as new CHW
          </Link>
        </motion.form>

        <div className="mt-6 text-center">
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs text-fg-tertiary hover:text-ghana-gold transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Admin Portal Login
          </Link>
        </div>
      </div>
    </div>
  )
}
