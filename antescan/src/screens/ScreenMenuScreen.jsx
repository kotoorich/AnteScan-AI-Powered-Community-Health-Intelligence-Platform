import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Activity, Baby, Droplets, ChevronLeft } from 'lucide-react'

const MODULES = [
  {
    key: 'antenatal',
    title: 'Antenatal Screening',
    subtitle: 'Pregnant women — vitals, symptoms, AI risk score',
    icon: Activity,
    color: 'from-ghana-red/20 to-ghana-red/5 border-ghana-red/30 text-ghana-red',
  },
  {
    key: 'nutricheck',
    title: 'NutriCheck',
    subtitle: 'Children under 5 — MUAC, anthropometry, feeding',
    icon: Baby,
    color: 'from-ghana-gold/20 to-ghana-gold/5 border-ghana-gold/30 text-yellow-700 dark:text-ghana-gold',
  },
  {
    key: 'sickle',
    title: 'Sickle Cell',
    subtitle: 'Blood smear capture + clinical signs',
    icon: Droplets,
    color: 'from-ghana-green/20 to-ghana-green/5 border-ghana-green/30 text-ghana-green',
  },
]

export default function ScreenMenuScreen() {
  const nav = useNavigate()
  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => nav(-1)} className="p-2 -ml-2 rounded-full hover:bg-bg-secondary">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-2xl font-extrabold">Start a Screening</h1>
      </div>

      <div className="space-y-3">
        {MODULES.map((m, i) => {
          const Icon = m.icon
          return (
            <motion.button
              key={m.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => nav('/screen/' + m.key)}
              className={`w-full text-left p-5 rounded-2xl bg-gradient-to-br ${m.color} border-2`}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-bg-card border border-border flex items-center justify-center">
                  <Icon className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <div className="font-display text-lg font-bold text-fg">{m.title}</div>
                  <div className="text-sm text-fg-secondary">{m.subtitle}</div>
                </div>
                <div className="text-3xl opacity-50">→</div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
