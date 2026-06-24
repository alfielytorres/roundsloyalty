'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RootPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/auth/sign-in', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error ?? 'Invalid email or password.'); return }
      router.push(data.redirect ?? '/dashboard')
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
          <p className="text-[11px] font-semibold tracking-widest text-black/25 uppercase mb-1.5">Round Rewards</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Welcome back</h1>
          <p className="text-black/40 mt-0.5 text-sm">Sign in to your vendor portal</p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl bg-black/5 border border-black/10 px-4 py-3 text-sm text-black/60">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/90 shadow-sm p-5 flex flex-col gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Email</label>
            <input type="email" name="email" required placeholder="you@example.com" disabled={loading}
              className="w-full bg-white/80 border border-black/10 rounded-xl px-3.5 py-2.5 text-[#1D1D1F] placeholder-black/25 text-sm focus:outline-none focus:border-black/25 transition-colors" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Password</label>
            <input type="password" name="password" required placeholder="••••••••" disabled={loading}
              className="w-full bg-white/80 border border-black/10 rounded-xl px-3.5 py-2.5 text-[#1D1D1F] placeholder-black/25 text-sm focus:outline-none focus:border-black/25 transition-colors" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[#1D1D1F] hover:bg-black disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors text-sm mt-1">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-[13px] text-black/30 mt-5">
          No account?{' '}
          <Link href="/sign-up" className="font-semibold text-black/60 hover:text-black">Create one free</Link>
        </p>
        <p className="text-center text-xs text-black/20 mt-1.5">
          Customers — use the <span className="text-black/35 font-medium">Rounds</span> mobile app
        </p>
      </div>
    </main>
  )
}
