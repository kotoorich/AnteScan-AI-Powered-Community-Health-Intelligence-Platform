import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, Phone, Lock, Loader2 } from 'lucide-react'
import { useToast } from '../context/ToastContext.jsx'
import { api } from '../services/api.js'
import OTPInput from '../components/ui/OTPInput.jsx'

export default function ForgotPasswordScreen() {
  const nav = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(1)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const requestOtp = async () => {
    if (!/^0(20|24|50|54|55|59|26|56|27|57)\d{7}$/.test(phone)) {
      return toast.error('Invalid Ghana phone number')
    }
    setLoading(true)
    try {
      await api.auth.forgotRequest(phone)
      toast.success('OTP sent. Check your SMS.')
      setStep(2)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = (otp) => {
    setCode(otp)
    setStep(3)
  }

  const resetPassword = async () => {
    if (newPassword.length < 6) return toast.error('Min 6 characters')
    setLoading(true)
    try {
      await api.auth.forgotVerify(phone, code, newPassword)
      toast.success('Password reset. Please log in.')
      nav('/login')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col px-6 py-10 safe-top safe-bottom">
      <Link to="/login" className="flex items-center gap-1.5 text-sm text-fg-secondary mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to login
      </Link>

      <div className="flex-1">
        <div className="w-14 h-14 rounded-xl bg-ghana-gold/15 flex items-center justify-center mb-6">
          <ShieldCheck className="w-7 h-7 text-ghana-gold" />
        </div>
        <h1 className="text-2xl font-display font-bold mb-2">Reset Password</h1>
        <p className="text-sm text-fg-secondary mb-6">
          {step === 1 && 'Enter your registered phone number to receive a verification code.'}
          {step === 2 && `We sent a 4-digit code to ${phone}. Enter it below.`}
          {step === 3 && 'Choose a new password (min 6 characters).'}
        </p>

        {step === 1 && (
          <div className="space-y-3">
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-fg-tertiary" />
              <input type="tel" inputMode="tel" value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="02XXXXXXXXX"
                className="w-full pl-9 pr-3 py-2.5 bg-bg-card border border-border rounded-xl" />
            </div>
            <button onClick={requestOtp} disabled={loading}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Send code
            </button>
          </div>
        )}

        {step === 2 && (
          <OTPInput length={4} onComplete={verifyOtp} />
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-fg-tertiary" />
              <input type="password" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full pl-9 pr-3 py-2.5 bg-bg-card border border-border rounded-xl" />
            </div>
            <button onClick={resetPassword} disabled={loading}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Reset password
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
