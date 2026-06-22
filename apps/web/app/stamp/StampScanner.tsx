'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, X, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react'

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
    const res = await fetch('/api/stamp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_token: token.trim(), vendor_id: vendorId, source: 'staff_scan', idempotency_key: crypto.randomUUID() }),
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
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // ── Success state ──────────────────────────────────────────
  if (result) {
    return (
      <div className="flex flex-col items-center text-center py-8 px-6 glass">
        <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-4">
          <CheckCircle size={32} className="text-[#1D1D1F]" strokeWidth={1.8} />
        </div>
        <p className="text-2xl font-black text-[#1D1D1F]">
          +{result.rounds_awarded} Round{result.rounds_awarded !== 1 ? 's' : ''}
        </p>
        <p className="text-black/40 text-sm mt-1">
          {preview?.display_name ?? 'Customer'} now has {result.new_balance} round{result.new_balance !== 1 ? 's' : ''}
        </p>
        {result.campaign_name && (
          <p className="mt-2 text-xs font-semibold text-black/50 bg-black/5 px-3 py-1 rounded-full">
            🎯 Campaign: {result.campaign_name}
          </p>
        )}
        {result.reward_unlocked && (
          <div className="mt-3 w-full bg-[#1D1D1F] text-white rounded-2xl px-4 py-3">
            <p className="font-bold text-sm">🎉 Reward unlocked!</p>
            <p className="text-white/70 text-xs mt-0.5">{result.reward_name}</p>
          </div>
        )}
        <button
          onClick={handleReset}
          className="mt-6 flex items-center gap-1 text-sm font-semibold text-black/40 hover:text-black/70 transition-colors"
        >
          Stamp another customer <ChevronRight size={14} />
        </button>
      </div>
    )
  }

  // ── Scanner ────────────────────────────────────────────────
  return (
    <div className="glass overflow-hidden">
      {/* Camera */}
      {cameraOpen ? (
        <div className="relative bg-black aspect-[4/3]">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-52 h-52 border-2 border-white rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
          </div>
          <button
            onClick={stopCamera}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
          >
            <X size={16} />
          </button>
          <p className="absolute bottom-4 left-0 right-0 text-center text-white/60 text-xs">
            Point at the customer&apos;s QR code
          </p>
        </div>
      ) : (
        <button
          onClick={startCamera}
          className="w-full flex items-center justify-center gap-2 py-5 border-b border-black/5 text-black/40 hover:text-black/70 hover:bg-black/[0.02] transition-colors text-sm font-medium"
        >
          <Camera size={17} strokeWidth={1.8} />
          Open camera to scan
        </button>
      )}

      <div className="p-5">
        {cameraError && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-black/5 rounded-xl">
            <AlertCircle size={15} className="text-black/40 shrink-0 mt-0.5" />
            <p className="text-black/55 text-sm">{cameraError}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-black/5 rounded-xl">
            <AlertCircle size={15} className="text-black/40 shrink-0 mt-0.5" />
            <div>
              <p className="text-black/60 text-sm">{error}</p>
              <button onClick={() => setError(null)} className="mt-1 text-xs text-black/35 underline">Dismiss</button>
            </div>
          </div>
        )}

        {/* Token input */}
        <div className="mb-4">
          <label className="block text-[10px] font-bold text-black/30 tracking-widest uppercase mb-2">
            Customer Token
          </label>
          <input
            ref={inputRef}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAward()}
            placeholder="Scan or paste the customer token"
            className="w-full px-4 py-3 rounded-2xl bg-black/5 border border-black/8 text-[#1D1D1F] text-sm font-mono placeholder:text-black/25 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
            name="stamp_customer_token"
          />
        </div>

        {/* Customer preview */}
        {preview && (
          <div className="mb-4 flex items-center gap-3 p-3 bg-black/5 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center font-bold text-[#1D1D1F] text-sm shrink-0">
              {preview.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#1D1D1F] text-sm truncate">{preview.display_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1D1D1F] rounded-full"
                    style={{ width: `${Math.min((preview.current_rounds / preview.rounds_required) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-black/40 shrink-0">{preview.current_rounds}/{preview.rounds_required}</span>
              </div>
              <p className="text-[11px] text-black/30 mt-0.5">{preview.reward_name}</p>
            </div>
          </div>
        )}

        {/* Award button */}
        <button
          type="button"
          onClick={handleAward}
          disabled={loading || !token.trim()}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm bg-[#1D1D1F] hover:bg-black disabled:opacity-25 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing…
            </span>
          ) : (
            'Award Round'
          )}
        </button>
      </div>
    </div>
  )
}
