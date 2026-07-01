import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const FAQ = [
  { q: 'How do I record a new patient?', a: 'Tap the gold Screen button at the bottom, choose a module, then tap "New Patient".' },
  { q: 'What if I have no internet?', a: 'Forms still work offline. Records are saved and synced automatically when you reconnect.' },
  { q: 'How does voice input work?', a: 'Tap the gold microphone on any form and speak your patient\'s symptoms in Twi, Ga, Ewe or English.' },
  { q: 'What is the Family Elder field?', a: 'A trusted female elder (grandmother) who receives SMS alerts when a patient is flagged high risk.' },
]

export default function FloatingHelp() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-30 w-12 h-12 rounded-full bg-ghana-gold shadow-gold-glow flex items-center justify-center active:scale-90 transition"
        aria-label="Help"
      >
        <MessageCircle className="w-5 h-5 text-black" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed bottom-0 inset-x-0 z-50 bg-bg-card rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold">Help & FAQ</h3>
                <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-bg-secondary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                {FAQ.map((item, i) => (
                  <details key={i} className="card p-3 group">
                    <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">
                      {item.q}
                      <span className="text-ghana-gold ml-2 group-open:rotate-180 transition">⌄</span>
                    </summary>
                    <p className="mt-2 text-sm text-fg-secondary">{item.a}</p>
                  </details>
                ))}
              </div>
              <button className="btn-outline w-full mt-4">Contact My Supervisor</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
