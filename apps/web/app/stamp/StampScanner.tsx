'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { QrCode, Camera, X } from 'lucide-react'

export default function StampScanner() {
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)

  const [token, setToken] = useState('')
  const [action, setAction] = useState<'stamp' | 'points'>('stamp')
  const [count, setCount] = useState(1)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!cameraOpen) inputRef.current?.focus()
  }, [cameraOpen])

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOpen(false)
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    setCameraOpen(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        rafRef.current = requestAnimationFrame(scanFrame)
      }
    } catch {
      setCameraError('Camera access denied. Please allow camera access and try again.')
      setCameraOpen(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scanFrame = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanFrame)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    let detected: string | null = null

    if ('BarcodeDetector' in window) {
      try {
        // @ts-ignore
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        const codes = await detector.detect(video)
        if (codes.length > 0) detected = codes[0].rawValue as string
      } catch { /* fall through */ }
    }

    if (!detected) {
      try {
        const jsQR = (await import('jsqr')).default
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code) detected = code.data
      } catch { /* fall through */ }
    }

    if (detected) {
      stopCamera()
      setToken(detected)
      return
    }

    rafRef.current = requestAnimationFrame(scanFrame)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopCamera])

  useEffect(() => () => { stopCamera() }, [stopCamera])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)

    const body = action === 'stamp'
      ? { token: token.trim(), action: 'stamp', count }
      : { token: token.trim(), action: 'points', amount: parseFloat(amount) || 0 }

    const res = await fetch('/api/stamp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      router.push(`/stamp?error=${encodeURIComponent(json.error ?? 'Something went wrong')}`)
    } else {
      setToken('')
      setAmount('')
      router.push(`/stamp?success=${encodeURIComponent(json.message ?? 'Done!')}`)
      router.refresh()
    }

    inputRef.current?.focus()
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <QrCode size={20} className="text-[#22C55E]" />
            Scan or enter membership token
          </h2>
          <p className="text-white/50 text-sm mt-1">
            Ask the customer to show their QR code, or scan with camera below.
          </p>
        </div>
        <button
          type="button"
          onClick={cameraOpen ? stopCamera : startCamera}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-colors shrink-0 ml-4 ${
            cameraOpen
              ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
              : 'bg-[#22C55E]/20 text-[#22C55E] hover:bg-[#22C55E]/30'
          }`}
        >
          {cameraOpen ? <><X size={15} />Close</> : <><Camera size={15} />Camera</>}
        </button>
      </div>

      {cameraError && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-300 text-sm">
          {cameraError}
        </div>
      )}

      {cameraOpen && (
        <div className="mb-5 relative rounded-2xl overflow-hidden bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-[#22C55E] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
          <p className="absolute bottom-3 left-0 right-0 text-center text-white/60 text-xs">Point at the customer&apos;s QR code</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold text-white mb-2">Membership token</label>
          <input
            ref={inputRef}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Scan or paste the token from the customer's app"
            className="w-full dark-input font-mono text-sm"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Action</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAction('stamp')}
              className={`flex-1 py-2.5 rounded-2xl font-semibold text-sm transition-colors ${
                action === 'stamp' ? 'bg-[#22C55E] text-[#081C12]' : 'bg-white/10 text-white/60 hover:bg-white/15'
              }`}
            >
              Add stamp
            </button>
            <button
              type="button"
              onClick={() => setAction('points')}
              className={`flex-1 py-2.5 rounded-2xl font-semibold text-sm transition-colors ${
                action === 'points' ? 'bg-[#22C55E] text-[#081C12]' : 'bg-white/10 text-white/60 hover:bg-white/15'
              }`}
            >
              Add points
            </button>
          </div>
        </div>

        {action === 'stamp' ? (
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Stamps to add</label>
            <div className="flex gap-2">
              {[1, 2, 3, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={`w-12 h-12 rounded-2xl font-bold text-sm transition-colors ${
                    count === n ? 'bg-[#22C55E] text-[#081C12]' : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Purchase amount ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full dark-input"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !token.trim() || (action === 'points' && !amount)}
          className="w-full btn-primary disabled:opacity-40"
        >
          {loading ? 'Processing…' : action === 'stamp' ? `Add ${count} stamp${count !== 1 ? 's' : ''}` : 'Add points'}
        </button>
      </form>
    </div>
  )
}
