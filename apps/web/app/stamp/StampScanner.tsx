'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QrCode } from 'lucide-react'

export default function StampScanner() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [token, setToken] = useState('')
  const [action, setAction] = useState<'stamp' | 'points'>('stamp')
  const [count, setCount] = useState(1)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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
    <div className="glass-card p-8">
      <h2 className="flex items-center gap-2 text-xl font-bold text-white mb-2">
        <QrCode size={20} className="text-[#8B5CF6]" />
        Scan or enter membership token
      </h2>
      <p className="text-white/50 text-sm mb-6">
        Ask the customer to open their Rounds app and show their QR code.
        A USB/Bluetooth scanner will fill this automatically.
      </p>
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
                action === 'stamp' ? 'bg-[#8B5CF6] text-white' : 'bg-white/10 text-white/60 hover:bg-white/15'
              }`}
            >
              Add stamp
            </button>
            <button
              type="button"
              onClick={() => setAction('points')}
              className={`flex-1 py-2.5 rounded-2xl font-semibold text-sm transition-colors ${
                action === 'points' ? 'bg-[#8B5CF6] text-white' : 'bg-white/10 text-white/60 hover:bg-white/15'
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
                    count === n ? 'bg-[#8B5CF6] text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
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
