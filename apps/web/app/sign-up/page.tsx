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
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F0EDE8]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-[#111] flex items-center justify-center mb-5 shadow-lg">
            <span className="text-white text-2xl font-black tracking-tight">R</span>
          </div>
          <p className="text-xs font-bold tracking-widest text-black/30 uppercase mb-2">Rounds Vendor</p>
          <h1 className="text-3xl font-extrabold text-[#111]">Create account</h1>
          <p className="text-black/40 mt-1 text-sm">Set up your vendor portal</p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-500">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/80 shadow-sm p-6 flex flex-col gap-4">
          {[
            { label: 'Business name', name: 'businessName', type: 'text', placeholder: 'e.g. Daily Grind' },
            { label: 'Email', name: 'email', type: 'email', placeholder: 'you@example.com' },
            { label: 'Password', name: 'password', type: 'password', placeholder: 'Min. 8 characters' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">{f.label}</label>
              <input type={f.type} name={f.name} required minLength={f.name === 'password' ? 8 : undefined}
                placeholder={f.placeholder} disabled={loading}
                className="w-full bg-white/80 border border-black/10 rounded-2xl px-4 py-3 text-[#111] placeholder-black/25 text-sm focus:outline-none focus:border-[#E8805A]/50 transition-colors" />
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full bg-[#111] hover:bg-[#222] disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-colors text-sm tracking-wide mt-1">
            {loading ? 'Creating account…' : 'Create account →'}
          </button>
        </form>

        <p className="text-center text-sm text-black/30 mt-6">
          Already have an account?{' '}
          <a href="/" className="font-semibold text-[#E8805A] hover:opacity-80">Sign in</a>
        </p>
      </div>
    </main>
  )
}
