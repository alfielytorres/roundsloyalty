'use client'

import { useState } from 'react'
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
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F0EDE8]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-[#111] flex items-center justify-center mb-5 shadow-lg">
            <span className="text-white text-2xl font-black tracking-tight">R</span>
          </div>
          <p className="text-xs font-bold tracking-widest text-black/30 uppercase mb-2">Rounds Vendor</p>
          <h1 className="text-3xl font-extrabold text-[#111]">Welcome back</h1>
          <p className="text-black/40 mt-1 text-sm">Sign in to your vendor portal</p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-500">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/80 shadow-sm p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Email</label>
            <input type="email" name="email" required placeholder="you@example.com" disabled={loading}
              className="w-full bg-white/80 border border-black/10 rounded-2xl px-4 py-3 text-[#111] placeholder-black/25 text-sm focus:outline-none focus:border-[#E8805A]/50 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Password</label>
            <input type="password" name="password" required placeholder="••••••••" disabled={loading}
              className="w-full bg-white/80 border border-black/10 rounded-2xl px-4 py-3 text-[#111] placeholder-black/25 text-sm focus:outline-none focus:border-[#E8805A]/50 transition-colors" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[#111] hover:bg-[#222] disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-colors text-sm tracking-wide mt-1">
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        <p className="text-center text-sm text-black/30 mt-6">
          No account?{' '}
          <Link href="/sign-up" className="font-semibold text-[#E8805A] hover:opacity-80">Create one free</Link>
        </p>
        <p className="text-center text-xs text-black/25 mt-2">
          Customers — use the <span className="text-black/40 font-semibold">Rounds</span> mobile app
        </p>
      </div>
    </main>
  )
}
