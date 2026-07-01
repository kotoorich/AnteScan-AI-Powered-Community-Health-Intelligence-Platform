import { useState, useRef, useCallback, useEffect } from 'react'

export function useCamera(options = {}) {
  const {
    facingMode = 'environment',
    width = 1280,
    height = 720,
    autoStart = true,
  } = options

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)

  const start = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: width },
          height: { ideal: height },
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

      const videoTrack = mediaStream.getVideoTracks()[0]
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities()
        setTorchSupported(!!capabilities.torch)
      }
    } catch (err) {
      setError('Could not access camera. Please grant permission.')
      console.error('Camera error:', err)
    } finally {
      setLoading(false)
    }
  }, [facingMode, width, height])

  const stop = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsReady(false)
  }, [stream])

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.95)
  }, [])

  const toggleTorch = useCallback(() => {
    if (!stream || !torchSupported) return false
    const videoTrack = stream.getVideoTracks()[0]
    if (!videoTrack) return false
    
    try {
      const capabilities = videoTrack.getCapabilities()
      const settings = videoTrack.getSettings()
      const currentTorch = settings.torch || false
      videoTrack.applyConstraints({
        advanced: [{ torch: !currentTorch }]
      })
      return !currentTorch
    } catch {
      return false
    }
  }, [stream, torchSupported])

  const switchCamera = useCallback(() => {
    stop()
    start()
  }, [stop, start])

  useEffect(() => {
    if (autoStart) {
      start()
    }
    return () => {
      stop()
    }
  }, [autoStart, start, stop])

  return {
    videoRef,
    canvasRef,
    stream,
    isReady,
    error,
    loading,
    torchSupported,
    start,
    stop,
    capture,
    toggleTorch,
    switchCamera,
  }
}