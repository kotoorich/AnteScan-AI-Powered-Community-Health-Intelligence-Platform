import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Heart, Stethoscope, Baby, Mic, WifiOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const SLIDES = [
  { icon: Heart, title: 'Welcome to AnteScan', subtitle: "Ghana's community health intelligence platform. Screen patients, save lives." },
  { icon: Stethoscope, title: 'Antenatal Risk Screening', subtitle: 'Enter patient vitals and symptoms. Our AI instantly tells you the risk level and next action.' },
  { icon: Baby, title: 'NutriCheck for Children', subtitle: 'Screen children under 5 for malnutrition using MUAC measurements and our smart camera.' },
  { icon: Mic, title: 'Voice Input in Your Language', subtitle: 'Speak symptoms in Twi, Ga, Ewe or Hausa. The app understands you.' },
  { icon: WifiOff, title: 'Works Offline Anywhere', subtitle: 'No internet? No problem. AnteScan works fully offline and syncs when you reconnect.' },
]

export default function OnboardingScreen() {
  const [idx, setIdx] = useState(0)
  const nav = useNavigate()
  const { completeOnboarding } = useAuth()
  const slide = SLIDES[idx]
  const Icon = slide.icon

  const next = () => {
    if (idx < SLIDES.length - 1) setIdx(idx + 1)
    else finish()
  }
  const finish = () => {
    completeOnboarding()
    nav('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col px-6 pt-12 pb-10 safe-top safe-bottom">
      <button onClick={finish} className="self-end text-sm font-semibold text-fg-secondary">
        Skip
      </button>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            <div className="relative w-40 h-40 mb-10 rounded-full bg-gradient-to-br from-ghana-gold/20 to-ghana-green/10 flex items-center justify-center">
              <div className="absolute inset-3 rounded-full border-2 border-dashed border-ghana-gold/40" />
              <Icon className="w-20 h-20 text-ghana-gold" strokeWidth={1.4} />
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">{slide.title}</h1>
            <p className="mt-3 text-fg-secondary max-w-xs">{slide.subtitle}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-1.5 mb-6">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-2 rounded-full transition-all ${
              i === idx ? 'w-8 bg-ghana-gold' : 'w-2 bg-fg-tertiary/30'
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => idx > 0 && setIdx(idx - 1)}
          disabled={idx === 0}
          className="text-sm font-semibold text-fg-secondary disabled:opacity-0"
        >
          ← Back
        </button>
        <button onClick={next} className="btn-gold px-8">
          {idx === SLIDES.length - 1 ? 'Get Started →' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
