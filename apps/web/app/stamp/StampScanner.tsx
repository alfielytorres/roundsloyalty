'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { QrCode, Camera, X, Award, User } from 'lucide-react'

interface CustomerPreview {
  display_name: string
  current_rounds: number
  rounds_required: number
  reward_name: string
}

interface AwardResult {
  rounds_awarded: number
  new_balance: number
  campaign_name: string | null
  reward_unlocked: boolean
  reward_name: string | null
}

export default function StampScanner({ vendorId }: { vendorId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)

  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [preview, setPreview] = useState<CustomerPreview | null>(null)
  const [result, setResult] = useState<AwardResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => { if (!cameraOpen) inputRef.current?.focus() }, [cameraOpen])

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOpen(false)
  }, [])

  const scanFrame = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) { rafRef.current = requestAnimationFrame(scanFrame); return }
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
    if (detected) { stopCamera(); setToken(detected); return }
    rafRef.current = requestAnimationFrame(scanFrame)
  }, [stopCamera])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    setCameraOpen(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); rafRef.current = requestAnimationFrame(scanFrame) }
    } catch {
      setCameraError('Camera access denied. Please allow camera access and try again.')
      setCameraOpen(false)
    }
  }, [scanFrame])

  useEffect(() => () => { stopCamera() }, [stopCamera])

  useEffect(() => {
    if (!token.trim()) { setPreview(null); return }
    let cancelled = false
    fetch('/api/stamp/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_token: token.trim(), vendor_id: vendorId }),
    })
      .then((r) => r.json())
      .then((data) => { if (!cancelled && data.customer) setPreview(data.customer) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [token, vendorId])

  async function handleAward() {
    if (!token.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    const idempotency_key = crypto.randomUUID()
    const res = await fetch('/api/stamp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_token: token.trim(), vendor_id: vendorId, source: 'staff_scan', idempotency_key }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong')
    } else {
      setResult(json)
      router.refresh()
    }
  }

  function handleReset() {
    setToken('')
    setPreview(null)
    setResult(null)
    setError(null)
    inputRef.current?.focus()
  }

  return (
    <div className="glass">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-[#1D1D1F]">
            <QrCode size={17} className="text-black/40" />
            Scan customer QR
          </h2>
          <p className="text-black/35 text-sm mt-0.5">Ask the customer to open the app and show their QR code.</p>
        </div>
        <button type="button" onClick={cameraOpen ? stopCamera : startCamera}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors shrink-0 ml-3 border ${
            cameraOpen
              ? 'bg-black/5 text-black/60 border-black/10 hover:bg-black/10'
              : 'bg-black/5 text-black/50 border-black/10 hover:bg-black/10'
          }`}>
          {cameraOpen ? <><X size={13} />Close</> : <><Camera size={13} />Camera</>}
        </button>
      </div>

      {cameraError && (
        <div className="mb-4 p-3 bg-black/5 border border-black/10 rounded-xl text-black/60 text-sm">{cameraError}</div>
      )}

      {cameraOpen && (
        <div className="mb-4 relative rounded-2xl overflow-hidden bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" />
          </div>
          <p className="absolute bottom-3 left-0 right-0 text-center text-white/50 text-xs">Point at the customer&apos;s QR code</p>
        </div>
      )}

      {result && (
        <div className="mb-4 bg-black/5 border border-black/10 rounded-2xl p-4">
          <p className="font-bold text-[#1D1D1F] text-base">+{result.rounds_awarded} Round{result.rounds_awarded !== 1 ? 's' : ''} Awarded</p>
          <p className="text-black/45 text-sm mt-0.5">New balance: {result.new_balance} rounds</p>
          {result.campaign_name && <p className="text-black/45 text-sm mt-0.5">Campaign: {result.campaign_name}</p>}
          {result.reward_unlocked && <p className="text-black/70 text-sm font-semibold mt-1">Reward unlocked: {result.reward_name}</p>}
          <button onClick={handleReset} className="mt-3 text-sm font-semibold text-black/50 underline">Scan another</button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-black/5 border border-black/10 rounded-xl">
          <p className="text-black/60 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="mt-1.5 text-sm font-semibold text-black/40 underline">Dismiss</button>
        </div>
      )}

      {!result && (
        <>
          <div className="mb-3">
            <label className="block text-xs font-semibold text-black/35 tracking-widest uppercase mb-1.5">Customer token</label>
            <input
              ref={inputRef}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Scan or paste the customer token"
              className="dark-input font-mono text-sm"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </div>

          {preview && (
            <div className="mb-3 bg-black/5 border border-black/10 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center">
                  <User size={16} className="text-black/40" />
                </div>
                <div>
                  <p className="font-semibold text-[#1D1D1F]">{preview.display_name}</p>
                  <p className="text-black/40 text-sm">{preview.current_rounds} / {preview.rounds_required} rounds</p>
                </div>
              </div>
              <div className="w-full bg-black/10 rounded-full h-1.5 mb-1.5">
                <div
                  className="bg-[#1D1D1F] rounded-full h-1.5 transition-all"
                  style={{ width: `${Math.min((preview.current_rounds / preview.rounds_required) * 100, 100)}%` }}
                />
              </div>
              <p className="text-black/30 text-xs">Reward: {preview.reward_name}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleAward}
            disabled={loading || !token.trim()}
            className="w-full py-3 rounded-2xl font-semibold text-white text-sm bg-[#1D1D1F] hover:bg-black disabled:opacity-30 transition-colors flex items-center justify-center gap-2"
          >
            <Award size={16} />
            {loading ? 'Processing…' : 'Award Round'}
          </button>
        </>
      )}
    </div>
  )
}
