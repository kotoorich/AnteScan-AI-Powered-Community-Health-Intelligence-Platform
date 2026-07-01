import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Heart, Database, Brain, Phone, Globe, Github } from 'lucide-react'
import GhanaIllustration from '../components/ui/GhanaIllustration.jsx'

const VERSION = '1.0.0'
const BUILD = '2026.06'

export default function AboutScreen() {
  const nav = useNavigate()

  return (
    <div className="space-y-4 pb-6 px-4 lg:px-0">
      <div className="flex items-center gap-2 -ml-2">
        <button onClick={() => nav(-1)} className="p-2 rounded-full hover:bg-bg-secondary">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-2xl font-extrabold">About AnteScan</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="card-elevated bg-bg-card p-5 text-center">
        <div className="flex justify-center"><GhanaIllustration size={180} /></div>
        <h2 className="font-display text-3xl font-extrabold bg-gradient-to-r from-ghana-gold via-amber-400 to-ghana-red bg-clip-text text-transparent">
          AnteScan
        </h2>
        <p className="text-sm text-fg-secondary">Community Health Intelligence · Ghana</p>
        <div className="text-xs text-fg-tertiary mt-2">Version {VERSION} · Build {BUILD}</div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="card-elevated bg-bg-card p-5 space-y-3 text-sm">
        <div className="flex items-start gap-3">
          <Heart className="w-5 h-5 text-ghana-red shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Our mission</div>
            <p className="text-fg-secondary">
              Empower Community Health Workers across Ghana to detect maternal and child
              health risks early, refer with confidence, and close the loop with facilities
              and family elders — even where the network barely reaches.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-ghana-gold shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Built on real data</div>
            <p className="text-fg-secondary">
              Models trained on UNICEF MICS6 (Ghana, 14,609 women + 8,903 children records)
              and DHS Ghana 2022 (34,595 births). Combined with WHO Z-score tables and
              GHS antenatal care guidelines for clinical safety.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Brain className="w-5 h-5 text-ghana-green shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">AI with a safety net</div>
            <p className="text-fg-secondary">
              Every model prediction is combined with rule-based red flags from GHS
              guidelines, so dangerous symptoms always trigger emergency — never overridden
              by a low model score.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="card-elevated bg-bg-card p-5 space-y-3">
        <div className="font-bold text-sm">Get in touch</div>
        <a href="tel:+233302681109" className="flex items-center gap-3 py-2 text-sm hover:text-ghana-gold">
          <Phone className="w-4 h-4" /> Ghana Health Service · +233 302 681 109
        </a>
        <a href="https://www.ghanahealthservice.org/" target="_blank" rel="noreferrer"
          className="flex items-center gap-3 py-2 text-sm hover:text-ghana-gold">
          <Globe className="w-4 h-4" /> ghanahealthservice.org
        </a>
        <a href="https://github.com/anthropics/" target="_blank" rel="noreferrer"
          className="flex items-center gap-3 py-2 text-sm hover:text-ghana-gold">
          <Github className="w-4 h-4" /> Open source contributions welcome
        </a>
      </motion.div>

      <p className="text-center text-xs text-fg-tertiary pt-4">
        Built for the Ghana AI Innovation Challenge 2026 🇬🇭
      </p>
    </div>
  )
}
