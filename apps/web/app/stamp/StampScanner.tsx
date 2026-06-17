'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
    <div className="bg-white rounded-3xl p-8 shadow-sm">
      <h2 className="text-xl font-bold text-primary-dark mb-2">Scan or enter card code</h2>
      <p className="text-taupe text-sm mb-6">
        Ask the customer to open their loyalty card in the Rounds app — the code shown there goes here.
        A USB/Bluetooth QR scanner will fill this automatically.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold text-primary-dark mb-2">Card code</label>
          <input
            ref={inputRef}
            value={cardCode}
            onChange={(e) => setCardCode(e.target.value)}
            placeholder="Scan or type the code from the customer's app"
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-primary-dark focus:outline-none focus:border-primary transition-colors font-mono"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-primary-dark mb-2">Stamps to add</label>
          <div className="flex gap-2">
            {[1, 2, 3, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStamps(n)}
                className={`w-12 h-12 rounded-2xl font-bold text-sm transition-colors ${
                  stamps === n
                    ? 'bg-primary text-white'
                    : 'bg-cream text-primary-dark hover:bg-primary-light'
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
