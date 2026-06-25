'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Spinner from '@/components/Spinner'

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
          <Image src="/logo.svg" alt="Rounds" width={56} height={56} unoptimized priority className="mb-4" />
          <p className="text-base font-bold tracking-tight text-black/30 mb-1.5">Rounds</p>
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
            className="w-full inline-flex items-center justify-center gap-2 bg-rounds hover:bg-rounds-hover disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors text-sm mt-1">
            {loading ? <><Spinner />Creating account…</> : 'Create account'}
          </button>
        </form>

        <p className="text-center text-[13px] text-black/30 mt-5">
          Already have an account?{' '}
          <Link href="/" className="font-semibold text-black/60 hover:text-black">Sign in</Link>
        </p>
      </div>
    </main>
  )
}
