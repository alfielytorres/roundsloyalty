'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogIn } from 'lucide-react'

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
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? 'Invalid email or password.')
        return
      }

      router.push(data.redirect ?? '/dashboard')
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <img src="/logo.svg" alt="Rounds Loyalty" className="w-24 h-24 mb-4" />
          <h1 className="text-3xl font-extrabold text-white">Rounds Loyalty</h1>
          <p className="text-white/50 mt-2 text-center">Vendor portal — reward your customers</p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-500/20 border border-red-500/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-white mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="w-full dark-input"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              placeholder="Your password"
              className="w-full dark-input"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-70 text-[#081C12] font-bold py-3 rounded-2xl mt-2 transition-colors"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-[#081C12]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={16} />
                Sign in
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-white/50 mt-4">
          No account?{' '}
          <Link href="/sign-up" className="font-semibold text-[#22C55E] hover:underline">
            Create one free
          </Link>
        </p>

        <p className="text-center text-sm text-white/50 mt-3">
          Customers? Use the{' '}
          <span className="font-semibold text-[#22C55E]">Rounds Loyalty</span> mobile app.
        </p>
      </div>
    </main>
  )
}
