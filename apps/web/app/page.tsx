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
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F8F5F1]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#16A34A] flex items-center justify-center mb-4 shadow-lg shadow-green-200">
            <span className="text-white text-2xl font-black">R</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#111111]">Rounds Loyalty</h1>
          <p className="text-[#6B7280] mt-1 text-center">Vendor portal — sign in to continue</p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="bg-white rounded-3xl border border-[#E8E2D9] shadow-sm p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">Email</label>
              <input type="email" name="email" required placeholder="you@example.com" className="w-full dark-input" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">Password</label>
              <input type="password" name="password" required placeholder="Your password" className="w-full dark-input" disabled={loading} />
            </div>
            <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 w-full bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 text-white font-bold py-3 rounded-2xl mt-1 transition-colors">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <><LogIn size={16} />Sign in</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#6B7280] mt-5">
          No account?{' '}
          <Link href="/sign-up" className="font-semibold text-[#16A34A] hover:underline">Create one free</Link>
        </p>
        <p className="text-center text-sm text-[#9CA3AF] mt-2">
          Customers? Use the <span className="font-semibold text-[#111111]">Rounds Loyalty</span> mobile app.
        </p>
      </div>
    </main>
  )
}
