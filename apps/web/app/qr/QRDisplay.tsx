'use client'

import { useEffect, useState, useCallback } from 'react'
import QRCode from 'react-qr-code'
import { RefreshCw } from 'lucide-react'

const EXPIRY_SECS = 300

export default function QRDisplay() {
  const [payload, setPayload] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState(0)
  const [secondsRemaining, setSecondsRemaining] = useState(EXPIRY_SECS)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPayload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/qr-payload')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate QR code')
      setPayload(data.payload)
      setExpiresAt(data.expiresAt)
      setSecondsRemaining(Math.round((data.expiresAt - Date.now()) / 1000))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPayload() }, [fetchPayload])

  useEffect(() => {
    if (!expiresAt) return
    const interval = setInterval(() => {
      const remaining = Math.round((expiresAt - Date.now()) / 1000)
      if (remaining <= 0) {
        fetchPayload()
      } else {
        setSecondsRemaining(remaining)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, fetchPayload])

  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = secondsRemaining % 60
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`
  const progress = secondsRemaining / EXPIRY_SECS

  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-[#6B7280] text-sm text-center">
        Show this QR code to customers so they can earn stamps on the Rounds app
      </p>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#E8E2D9] flex items-center justify-center min-h-[300px]">
        {loading ? (
          <div className="w-[260px] h-[260px] flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#16A34A] border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="text-center text-[#DC2626] text-sm max-w-[260px]">{error}</div>
        ) : payload ? (
          <QRCode value={payload} size={260} />
        ) : null}
      </div>

      {!error && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-[#9CA3AF] text-sm">Refreshes in {timeString}</p>
          <div className="relative w-12 h-12">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#D1FAE5" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke="#16A34A" strokeWidth="2.5"
                strokeDasharray={`${progress * 100} 100`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s linear' }}
              />
            </svg>
          </div>
          <button
            onClick={fetchPayload}
            className="flex items-center gap-2 text-sm font-medium text-[#16A34A] hover:text-[#15803D] transition-colors"
          >
            <RefreshCw size={14} />
            Refresh Now
          </button>
        </div>
      )}
    </div>
  )
}
