'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QrCode } from 'lucide-react'

export default function StampScanner() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cardCode, setCardCode] = useState('')
  const [stamps, setStamps] = useState(1)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Autofocus so a USB/Bluetooth QR scanner types straight into the field
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cardCode.trim()) return
    setLoading(true)

    const res = await fetch('/api/stamp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_code: cardCode.trim(), stamps }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      router.push(`/stamp?error=${encodeURIComponent(json.error ?? 'Something went wrong')}`)
    } else {
      setCardCode('')
      router.push(`/stamp?success=${encodeURIComponent(`+${stamps} stamp${stamps !== 1 ? 's' : ''} added for ${json.customer_name ?? 'customer'}!`)}`)
      router.refresh()
    }

    inputRef.current?.focus()
  }

  return (
    <div className="glass-card p-8">
      <h2 className="flex items-center gap-2 text-xl font-bold text-white mb-2"><QrCode size={20} className="text-[#7DB542]" />Scan or enter card code</h2>
      <p className="text-white/50 text-sm mb-6">
        Ask the customer to open their loyalty card in the Rounds app — the code shown there goes here.
        A USB/Bluetooth QR scanner will fill this automatically.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold text-white mb-2">Card code</label>
          <input
            ref={inputRef}
            value={cardCode}
            onChange={(e) => setCardCode(e.target.value)}
            placeholder="Scan or type the code from the customer's app"
            className="w-full dark-input font-mono"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-white mb-2">Stamps to add</label>
          <div className="flex gap-2">
            {[1, 2, 3, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStamps(n)}
                className={`w-12 h-12 rounded-2xl font-bold text-sm transition-colors ${
                  stamps === n
                    ? 'bg-[#7DB542] text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !cardCode.trim()}
          className="w-full bg-primary text-white font-bold py-3 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {loading ? 'Stamping…' : `Add ${stamps} stamp${stamps !== 1 ? 's' : ''}`}
        </button>
      </form>
    </div>
  )
}
