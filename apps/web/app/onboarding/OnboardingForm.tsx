'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Store } from 'lucide-react'

export default function OnboardingForm({
  error: initialError,
  defaultBusinessName,
}: {
  error?: string
  defaultBusinessName?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError ?? null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/onboarding', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      router.push('/dashboard')
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
          <div className="w-20 h-20 rounded-3xl bg-[#22C55E] flex items-center justify-center mb-6 shadow-[0_0_32px_rgba(34,197,94,0.35)]">
            <Store size={36} className="text-[#081C12]" />
          </div>
          <h1 className="text-3xl font-extrabold text-white text-center">Set up your store</h1>
          <p className="text-white/50 mt-2 text-center">A few more details to get started</p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-500/20 border border-red-500/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-white mb-1">Business name</label>
            <input
              type="text"
              name="business_name"
              required
              defaultValue={defaultBusinessName}
              placeholder="e.g. The Coffee Corner"
              className="w-full dark-input"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1">Description</label>
            <input
              type="text"
              name="description"
              placeholder="Short description of your business"
              className="w-full dark-input"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1">Category</label>
            <select name="category" className="w-full dark-input" disabled={loading}>
              <option value="">Select a category</option>
              <option value="cafe">Cafe</option>
              <option value="restaurant">Restaurant</option>
              <option value="retail">Retail</option>
              <option value="beauty">Beauty &amp; Wellness</option>
              <option value="fitness">Fitness</option>
              <option value="other">Other</option>
            </select>
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
                Setting up your store...
              </>
            ) : (
              <>
                <Store size={16} />
                Launch my store
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  )
}
