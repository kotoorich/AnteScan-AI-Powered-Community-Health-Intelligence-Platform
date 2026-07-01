import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, CameraOff, X, Check, RefreshCw, Loader2, Zap, ZapOff } from 'lucide-react'

export default function CameraCapture({ 
  onCapture, 
  onClose, 
  mode = 'photo',
  autoAnalyze = false,
  className = '' 
}) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [captured, setCaptured] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')
  const [flash, setFlash] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)

  const startCamera = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
        setIsReady(true)
      }

      // Check if torch is supported
      const videoTrack = mediaStream.getVideoTracks()[0]
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities()
        setTorchSupported(!!capabilities.torch)
      }
    } catch (err) {
      setError('Could not access camera. Please grant permission and try again.')
      console.error('Camera error:', err)
    } finally {
      setLoading(false)
    }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsReady(false)
  }, [stream])

  const toggleFacing = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
    stopCamera()
  }

  const toggleFlash = () => {
    if (!torchSupported) return
    setFlash(prev => !prev)
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        try {
          videoTrack.applyConstraints({
            advanced: [{ torch: !flash }]
          })
        } catch (e) {
          // Flash toggle failed
        }
      }
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    setCaptured(dataUrl)
    
    if (autoAnalyze && onCapture) {
      onCapture(dataUrl)
    }
  }

  const retake = () => {
    setCaptured(null)
    setError(null)
  }

  const confirmCapture = () => {
    if (captured && onCapture) {
      onCapture(captured)
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  useEffect(() => {
    startCamera()
  }, [startCamera])

  useEffect(() => {
    if (mode === 'analysis' && isReady && !captured && !loading && !error) {
      const timer = setTimeout(() => {
        capturePhoto()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [mode, isReady, captured, loading, error])

  return (
    <div className={`relative bg-black rounded-2xl overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative aspect-video bg-black">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <Loader2 className="w-10 h-10 animate-spin text-ghana-gold" />
            <span className="ml-3 text-white text-sm">Starting camera...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
            <CameraOff className="w-12 h-12 text-ghana-red mb-3" />
            <p className="text-white text-sm">{error}</p>
            <button 
              onClick={startCamera} 
              className="mt-4 btn-gold text-sm px-6 py-2"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && !captured && (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
        )}

        {captured && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0"
          >
            <img 
              src={captured} 
              alt="Captured" 
              className="w-full h-full object-contain"
            />
          </motion.div>
        )}

        {isReady && !captured && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-white/80">Ready</span>
          </div>
        )}

        {mode === 'analysis' && isReady && !captured && (
          <div className="absolute top-3 left-3 bg-ghana-gold/90 text-black text-xs font-bold px-3 py-1 rounded-full">
            AI Analysis Mode
          </div>
        )}
      </div>

      {!loading && !error && (
        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4">
          <AnimatePresence>
            {!captured ? (
              <motion.div 
                key="live"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-3"
              >
                <button
                  onClick={toggleFacing}
                  className="p-3 rounded-full bg-black/50 backdrop-blur text-white hover:bg-black/70 transition"
                  aria-label="Switch camera"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>

                {mode === 'photo' && (
                  <button
                    onClick={capturePhoto}
                    className="w-16 h-16 rounded-full bg-ghana-gold border-4 border-white/30 hover:scale-105 transition active:scale-95"
                    aria-label="Capture"
                  />
                )}

                {torchSupported && (
                  <button
                    onClick={toggleFlash}
                    className={`p-3 rounded-full backdrop-blur transition ${
                      flash ? 'bg-ghana-gold text-black' : 'bg-black/50 text-white hover:bg-black/70'
                    }`}
                    aria-label="Toggle flash"
                  >
                    {flash ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="p-3 rounded-full bg-black/50 backdrop-blur text-white hover:bg-black/70 transition"
                  aria-label="Close camera"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="captured"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-3"
              >
                <button
                  onClick={retake}
                  className="px-4 py-2 rounded-full bg-black/50 backdrop-blur text-white hover:bg-black/70 transition flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Retake
                </button>

                <button
                  onClick={confirmCapture}
                  className="px-6 py-2 rounded-full bg-ghana-gold text-black font-bold hover:brightness-105 transition flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Use Photo
                </button>

                <button
                  onClick={onClose}
                  className="p-3 rounded-full bg-black/50 backdrop-blur text-white hover:bg-black/70 transition"
                  aria-label="Close camera"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}