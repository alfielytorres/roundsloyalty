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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // When token changes and isn't empty, fetch customer preview
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
    <div className="bg-white border border-[#E8E2D9] rounded-3xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-[#111111]">
            <QrCode size={20} className="text-[#E8805A]" />
            Scan customer QR
          </h2>
          <p className="text-[#6B7280] text-sm mt-1">Ask the customer to open the app and show their QR code.</p>
        </div>
        <button type="button" onClick={cameraOpen ? stopCamera : startCamera}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors shrink-0 ml-3 ${
            cameraOpen ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-orange-50 text-[#E8805A] hover:bg-orange-100 border border-orange-200'
          }`}>
          {cameraOpen ? <><X size={14} />Close</> : <><Camera size={14} />Camera</>}
        </button>
      </div>

      {cameraError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">{cameraError}</div>}

      {cameraOpen && (
        <div className="mb-5 relative rounded-2xl overflow-hidden bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-[#E8805A] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
          </div>
          <p className="absolute bottom-3 left-0 right-0 text-center text-white/70 text-xs">Point at the customer&apos;s QR code</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-2xl">
          <p className="font-black text-green-700 text-lg">+{result.rounds_awarded} Round{result.rounds_awarded !== 1 ? 's' : ''} Awarded!</p>
          <p className="text-green-700 text-sm mt-1">New balance: {result.new_balance} rounds</p>
          {result.campaign_name && (
            <p className="text-green-600 text-sm mt-1 font-semibold">Campaign: {result.campaign_name}</p>
          )}
          {result.reward_unlocked && (
            <p className="mt-2 font-bold text-[#E8805A]">Reward unlocked: {result.reward_name}!</p>
          )}
          <button onClick={handleReset} className="mt-3 text-sm font-semibold text-green-700 underline">
            Scan another
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="mt-2 text-sm font-semibold text-red-600 underline">Dismiss</button>
        </div>
      )}

      {!result && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-[#374151] mb-1.5">Customer token</label>
            <input
              ref={inputRef}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Scan or paste the customer token"
              className="w-full dark-input font-mono text-sm"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </div>

          {/* Customer preview */}
          {preview && (
            <div className="mb-4 p-4 bg-[#F8F5F1] border border-[#E8E2D9] rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#E8E2D9] flex items-center justify-center">
                  <User size={18} className="text-[#374151]" />
                </div>
                <div>
                  <p className="font-bold text-[#111111]">{preview.display_name}</p>
                  <p className="text-[#6B7280] text-sm">{preview.current_rounds} / {preview.rounds_required} rounds</p>
                </div>
              </div>
              <div className="w-full bg-[#E8E2D9] rounded-full h-2">
                <div
                  className="bg-[#E8805A] rounded-full h-2 transition-all"
                  style={{ width: `${Math.min((preview.current_rounds / preview.rounds_required) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[#9CA3AF] text-xs mt-1.5">Next reward: {preview.reward_name}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleAward}
            disabled={loading || !token.trim()}
            className="w-full py-4 rounded-2xl font-black text-white text-lg bg-[#E8805A] hover:bg-[#d4714e] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Award size={20} />
            {loading ? 'Processing…' : 'Award Round'}
          </button>
        </>
      )}
    </div>
  )
}
