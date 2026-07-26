'use client'

import { useEffect, useState, useCallback } from 'react'
import QRCode from 'react-qr-code'

export default function QRDisplay() {
  const [payload, setPayload] = useState<string | null>(null)
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPayload() }, [fetchPayload])

  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-black/40 text-sm text-center">
        Show this QR code to customers so they can earn stamps on the Weekends Club app
      </p>

      <div className="bg-white rounded-3xl p-8  border border-black/10 flex items-center justify-center min-h-[300px]">
        {loading ? (
          <div className="w-[260px] h-[260px] flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-[] border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="text-center text-[#DC2626] text-sm max-w-[260px]">{error}</div>
        ) : payload ? (
          <QRCode value={payload} size={260} />
        ) : null}
      </div>
    </div>
  )
}
