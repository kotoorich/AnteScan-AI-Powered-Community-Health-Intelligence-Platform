import { useRef, useEffect, useState } from 'react'

/**
 * Numeric OTP input — n single-digit boxes, auto-advance, paste-aware.
 * Calls `onComplete(code)` when all boxes are filled.
 */
export default function OTPInput({ length = 4, onComplete, disabled = false }) {
  const [digits, setDigits] = useState(Array(length).fill(''))
  const inputs = useRef([])

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  const setDigitAt = (idx, value) => {
    const next = [...digits]
    next[idx] = value
    setDigits(next)
    if (next.every((d) => d !== '')) {
      onComplete?.(next.join(''))
    }
  }

  const handleChange = (idx, e) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) {
      setDigitAt(idx, '')
      return
    }
    if (raw.length === 1) {
      setDigitAt(idx, raw)
      if (idx < length - 1) inputs.current[idx + 1]?.focus()
    } else {
      // Pasted full code
      const chars = raw.slice(0, length).split('')
      const next = [...digits]
      chars.forEach((c, i) => { next[i] = c })
      setDigits(next)
      const lastFilled = Math.min(chars.length, length) - 1
      inputs.current[Math.min(lastFilled + 1, length - 1)]?.focus()
      if (next.every((d) => d !== '')) {
        onComplete?.(next.join(''))
      }
    }
  }

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputs.current[idx - 1]?.focus()
    if (e.key === 'ArrowRight' && idx < length - 1) inputs.current[idx + 1]?.focus()
  }

  return (
    <div className="flex items-center justify-center gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-12 h-14 text-center text-xl font-bold bg-bg-card border-2 border-border rounded-xl focus:outline-none focus:border-ghana-gold transition disabled:opacity-50"
        />
      ))}
    </div>
  )
}
