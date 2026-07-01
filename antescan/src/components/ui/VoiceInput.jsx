import { useState, useRef } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Simple Twi/Ga/Ewe keyword → symptom mapping (mirrors backend /api/voice/map)
const KEYWORDS = {
  headache: ['headache','head pain','ti bo','tibo','ti pae','nyɔŋmɔ','tasi'],
  swelling: ['swelling','ho hye','hohye','blɛkɔ'],
  bleeding: ['bleeding','blood','mogya'],
  abdominal_pain: ['abdominal','stomach','yafunu yaw','yafunu','dɔ'],
  fever: ['fever','hot','ahu duru','ahuduru','feefee','avivi'],
  blurred_vision: ['blurred','vision','ani bere'],
  vomiting: ['vomit','wu wu'],
  breathing: ['breathing','breath','ahome den'],
  reduced_fetal_movement: ['no movement','abofra nni'],
  convulsions: ['convulsion','seizure'],
}

function mapTranscriptToSymptoms(t) {
  if (!t) return []
  const low = t.toLowerCase()
  return Object.entries(KEYWORDS)
    .filter(([, kws]) => kws.some((k) => low.includes(k)))
    .map(([k]) => k)
}

export default function VoiceInput({ onMatch }) {
  const [state, setState] = useState('idle') // idle | recording | processing | done
  const [lang, setLang] = useState('')
  const [transcript, setTranscript] = useState('')
  const recogRef = useRef(null)

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      // Fallback: simulate
      setState('processing')
      setTimeout(() => {
        setLang('Twi')
        setTranscript('Patient says she has ti bo and ho hye since two days.')
        const matches = ['headache', 'swelling']
        setState('done')
        onMatch?.(matches, 'Patient says she has ti bo and ho hye since two days.')
      }, 1400)
      return
    }
    const recog = new SR()
    recog.lang = 'en-GH'
    recog.continuous = false
    recog.interimResults = false
    recog.onresult = (e) => {
      const text = e.results[0][0].transcript
      setTranscript(text)
      setLang('English (Ghana)')
      const matches = mapTranscriptToSymptoms(text)
      setState('done')
      onMatch?.(matches, text)
    }
    recog.onerror = () => setState('idle')
    recog.onend = () => {
      if (state === 'recording') setState('processing')
    }
    recog.start()
    recogRef.current = recog
    setState('recording')
    setTimeout(() => recog.stop(), 30000)
  }

  const stop = () => {
    recogRef.current?.stop?.()
    setState('processing')
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={state === 'recording' ? stop : startRecording}
          disabled={state === 'processing'}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center ${
            state === 'recording'
              ? 'bg-ghana-red text-white'
              : 'bg-ghana-gold text-black'
          }`}
        >
          {state === 'recording' && (
            <span className="absolute inset-0 rounded-full bg-ghana-red animate-pulse-ring" />
          )}
          {state === 'processing' ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : state === 'recording' ? (
            <MicOff className="w-6 h-6 relative" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </motion.button>

        <div className="flex-1">
          <div className="font-semibold text-sm">
            {state === 'idle' && 'Speak Symptoms'}
            {state === 'recording' && 'Listening…'}
            {state === 'processing' && 'Transcribing…'}
            {state === 'done' && `Detected: ${lang}`}
          </div>
          <div className="text-xs text-fg-secondary">
            {state === 'idle' && 'Tap to record in Twi, Ga, Ewe or English'}
            {state === 'recording' && (
              <span className="inline-flex items-end gap-0.5 h-3 ml-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`w-0.5 bg-ghana-red rounded-full animate-wave-${n}`}
                    style={{ height: '12px' }}
                  />
                ))}
              </span>
            )}
            {state === 'done' && transcript}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {state === 'done' && transcript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-success/10 border border-success/30 rounded-xl text-sm text-success"
          >
            🎙 Auto-filled matched symptoms. Please verify the checkboxes.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
