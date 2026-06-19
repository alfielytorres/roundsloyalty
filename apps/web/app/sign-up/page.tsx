'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/auth/sign-up', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error ?? 'Something went wrong.'); return }
      if (data.message) { setError(data.message); return }
      router.push(data.redirect ?? '/onboarding')
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F5F5F7]">
      <div className="w-full max-w-xs">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#1D1D1F] flex items-center justify-center mb-4">
            <span className="text-white text-lg font-black tracking-tight">R</span>
          </div>
          <p className="text-[11px] font-semibold tracking-widest text-black/25 uppercase mb-1.5">Rounds Vendor</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Create account</h1>
          <p className="text-black/40 mt-0.5 text-sm">Set up your vendor portal</p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl bg-black/5 border border-black/10 px-4 py-3 text-sm text-black/60">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/90 shadow-sm p-5 flex flex-col gap-3">
          {[
            { label: 'Business name', name: 'businessName', type: 'text', placeholder: 'e.g. Daily Grind' },
            { label: 'Email', name: 'email', type: 'email', placeholder: 'you@example.com' },
            { label: 'Password', name: 'password', type: 'password', placeholder: 'Min. 8 characters' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">{f.label}</label>
              <input type={f.type} name={f.name} required minLength={f.name === 'password' ? 8 : undefined}
                placeholder={f.placeholder} disabled={loading}
                className="w-full bg-white/80 border border-black/10 rounded-xl px-3.5 py-2.5 text-[#1D1D1F] placeholder-black/25 text-sm focus:outline-none focus:border-black/25 transition-colors" />
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full bg-[#1D1D1F] hover:bg-black disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors text-sm mt-1">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-[13px] text-black/30 mt-5">
          Already have an account?{' '}
          <a href="/" className="font-semibold text-black/60 hover:text-black">Sign in</a>
        </p>
      </div>
    </main>
  )
}
