'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, X, CheckCircle, AlertCircle, ChevronRight, Zap, MapPin } from 'lucide-react'

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

export default function StampScanner({ vendorId, locations = [] }: { vendorId: string; locations?: { id: string; name: string }[] }) {
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
  const [locationId, setLocationId] = useState('')
  const router = useRouter()

  // Remember which store the staff is stamping at (so visits attribute correctly).
  useEffect(() => {
    if (locations.length === 0) return
    const saved = localStorage.getItem('stampLocation:' + vendorId)
    setLocationId(saved && locations.some(l => l.id === saved) ? saved : locations[0].id)
  }, [vendorId, locations])

  function pickLocation(id: string) {
    setLocationId(id)
    localStorage.setItem('stampLocation:' + vendorId, id)
  }

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
      body: JSON.stringify({ customer_token: token.trim(), vendor_id: vendorId, source: 'staff_scan', idempotency_key: crypto.randomUUID(), location_id: locationId || null }),
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
      <div className="glass flex flex-col items-center text-center py-10 px-6 animate-in fade-in duration-300">
        <div className="w-20 h-20 rounded-full bg-[#1D1D1F] flex items-center justify-center mb-5">
          <CheckCircle size={38} className="text-white" strokeWidth={2} />
        </div>
        <p className="text-3xl font-black text-[#1D1D1F] tracking-tight">
          +{result.rounds_awarded} Round{result.rounds_awarded !== 1 ? 's' : ''}
        </p>
        <p className="text-black/45 text-sm mt-1.5">
          {preview?.display_name ?? 'Customer'} now has {result.new_balance} round{result.new_balance !== 1 ? 's' : ''}
        </p>
        {result.campaign_name && (
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#1D1D1F] bg-black/[0.06] px-3 py-1.5 rounded-full">
            <Zap size={11} className="fill-[#1D1D1F]" /> {result.campaign_name}
          </span>
        )}
        {result.reward_unlocked && (
          <div className="mt-4 w-full bg-[#1D1D1F] text-white rounded-2xl px-4 py-3.5">
            <p className="font-bold text-sm">🎉 Reward unlocked!</p>
            <p className="text-white/60 text-xs mt-0.5">{result.reward_name}</p>
          </div>
        )}
        <button
          onClick={handleReset}
          className="mt-7 inline-flex items-center gap-1 text-sm font-semibold text-white bg-rounds hover:bg-rounds-hover px-5 py-2.5 rounded-full transition-colors"
        >
          Stamp another <ChevronRight size={15} />
        </button>
      </div>
    )
  }

  // ── Scanner ────────────────────────────────────────────────
  return (
    <div className="glass overflow-hidden !p-0">
      {/* Camera viewport */}
      {cameraOpen ? (
        <div className="relative bg-black aspect-[4/3] sm:aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-52 h-52 border-2 border-white/90 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
          </div>
          <button
            onClick={stopCamera}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <X size={16} />
          </button>
          <p className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-xs font-medium">
            Point at the customer&apos;s QR code
          </p>
        </div>
      ) : (
        <button
          onClick={startCamera}
          className="group w-full flex flex-col items-center justify-center gap-3 aspect-[4/3] sm:aspect-video bg-black/[0.03] hover:bg-black/[0.05] transition-colors"
        >
          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
            <Camera size={24} className="text-[#1D1D1F]" strokeWidth={1.8} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#1D1D1F]">Open camera</p>
            <p className="text-xs text-black/35 mt-0.5">Scan the customer&apos;s QR code</p>
          </div>
        </button>
      )}

      <div className="p-4 space-y-3">
        {locations.length > 1 && (
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-black/35 shrink-0" />
            <select value={locationId} onChange={(e) => pickLocation(e.target.value)}
              className="flex-1 text-sm rounded-xl bg-black/[0.04] border border-transparent px-3 py-2 text-[#1D1D1F] focus:outline-none focus:bg-white focus:border-black/15 transition-all">
              {locations.map((l) => <option key={l.id} value={l.id}>Stamping at {l.name}</option>)}
            </select>
          </div>
        )}
        {cameraError && (
          <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-600 text-xs">{cameraError}</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-600 text-xs">{error}</p>
              <button onClick={() => setError(null)} className="mt-1 text-[10px] text-red-400 hover:text-red-500 underline">Dismiss</button>
            </div>
          </div>
        )}

        {/* Manual token entry */}
        <div className="relative flex items-center">
          <span className="absolute left-3 text-[10px] font-bold text-black/25 tracking-wider uppercase pointer-events-none">or</span>
          <input
            ref={inputRef}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAward()}
            placeholder="paste customer token"
            className="w-full pl-9 pr-3 py-3 rounded-xl bg-black/[0.04] border border-transparent text-[#1D1D1F] text-sm placeholder:text-black/30 focus:outline-none focus:bg-white focus:border-black/15 transition-all"
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
          <div className="flex items-center gap-3 p-3 bg-black/[0.04] rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="w-9 h-9 rounded-full bg-[#1D1D1F] flex items-center justify-center font-bold text-white text-xs shrink-0">
              {preview.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#1D1D1F] text-sm truncate">{preview.display_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rounds rounded-full transition-all"
                    style={{ width: `${Math.min((preview.current_rounds / preview.rounds_required) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-black/40 shrink-0 tabular-nums">{preview.current_rounds}/{preview.rounds_required}</span>
              </div>
            </div>
          </div>
        )}

        {/* Award button */}
        <button
          type="button"
          onClick={handleAward}
          disabled={loading || !token.trim()}
          className="w-full py-3.5 rounded-xl font-bold text-white text-sm bg-rounds hover:bg-rounds-hover disabled:opacity-25 disabled:hover:bg-rounds transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing…
            </>
          ) : (
            'Award Round'
          )}
        </button>
      </div>
    </div>
  )
}
