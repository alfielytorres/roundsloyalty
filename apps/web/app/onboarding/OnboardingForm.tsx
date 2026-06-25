'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Store, Users, Search, ArrowLeft, CheckCircle } from 'lucide-react'
import Spinner from '@/components/Spinner'

type Step = 'choose' | 'create' | 'join' | 'requested'

interface VendorResult {
  id: string
  business_name: string
  category: string | null
}

export default function OnboardingForm({ error: initialError, defaultBusinessName }: { error?: string; defaultBusinessName?: string }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('choose')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<VendorResult[]>([])
  const [searching, setSearching] = useState(false)
  const [requestedStore, setRequestedStore] = useState('')

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/onboarding', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error ?? 'Something went wrong.'); return }
      router.push(data.redirect ?? '/dashboard')
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (q.trim().length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/staff/search-vendors?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSearchResults(data.vendors ?? [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  async function handleRequest(vendorId: string, vendorName: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/staff/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error ?? 'Something went wrong.'); return }
      setRequestedStore(vendorName)
      setStep('requested')
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'requested') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-black/5">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#111] flex items-center justify-center mb-4 shadow-lg mx-auto">
            <CheckCircle size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1D1D1F] mb-2">Request sent</h1>
          <p className="text-black/40 text-sm mb-6">Your request to join <strong className="text-black/70">{requestedStore}</strong> has been sent. The owner will approve or reject it — you&apos;ll get access once approved.</p>
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/80 p-5 text-left">
            <p className="text-sm text-black/50">Once approved, sign back in to access the vendor portal.</p>
          </div>
        </div>
      </main>
    )
  }

  if (step === 'join') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-black/5">
        <div className="w-full max-w-sm">
          <button onClick={() => { setStep('choose'); setError(null); setSearchResults([]); setSearchQuery('') }}
            className="flex items-center gap-2 text-black/40 text-sm font-medium mb-6 hover:text-black/60 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>

          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-[#111] flex items-center justify-center mb-4 shadow-lg">
              <Search size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1D1D1F] text-center">Find your store</h1>
            <p className="text-black/40 mt-1 text-center text-sm">Search by business name and request access</p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl bg-black/5 border border-black/10 px-4 py-3 text-sm text-black/60">{error}</div>
          )}

          <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/80 p-5">
            <div className="relative mb-4">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30" />
              <input
                type="text"
                placeholder="Search business name..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="dark-input w-full pl-9"
                autoFocus
              />
            </div>

            {searching && (
              <p className="text-black/35 text-sm text-center py-4">Searching...</p>
            )}

            {!searching && searchResults.length > 0 && (
              <div className="flex flex-col gap-2">
                {searchResults.map((v) => (
                  <button key={v.id} onClick={() => handleRequest(v.id, v.business_name)} disabled={loading}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-black/8 hover:bg-black/5 transition-colors text-left disabled:opacity-60">
                    <div>
                      <p className="font-semibold text-[#1D1D1F] text-sm">{v.business_name}</p>
                      {v.category && <p className="text-black/35 text-xs capitalize mt-0.5">{v.category}</p>}
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/40 border border-black/10 rounded-xl px-3 py-1.5 shrink-0 hover:bg-black/5">
                      {loading ? <><Spinner size={12} />…</> : 'Request'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-black/35 text-sm text-center py-4">No stores found matching &ldquo;{searchQuery}&rdquo;</p>
            )}

            {searchQuery.length < 2 && (
              <p className="text-black/30 text-xs text-center py-2">Type at least 2 characters to search</p>
            )}
          </div>
        </div>
      </main>
    )
  }

  if (step === 'create') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-black/5">
        <div className="w-full max-w-sm">
          <button onClick={() => { setStep('choose'); setError(null) }}
            className="flex items-center gap-2 text-black/40 text-sm font-medium mb-6 hover:text-black/60 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>

          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-[#111] flex items-center justify-center mb-4 shadow-lg">
              <Store size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1D1D1F] text-center">Set up your store</h1>
            <p className="text-black/40 mt-1 text-center text-sm">A few details to get started</p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl bg-black/5 border border-black/10 px-4 py-3 text-sm text-black/60">{error}</div>
          )}

          <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/80 p-6">
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Business name</label>
                <input type="text" name="business_name" required defaultValue={defaultBusinessName} placeholder="e.g. The Coffee Corner" className="w-full dark-input" disabled={loading} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Description</label>
                <input type="text" name="description" placeholder="Short description" className="w-full dark-input" disabled={loading} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Category</label>
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
              <button type="submit" disabled={loading}
                className="flex items-center justify-center gap-2 w-full bg-[#111] hover:bg-[#222] disabled:opacity-60 text-white font-bold py-3 rounded-2xl mt-1 transition-colors">
                {loading ? <><Spinner />Setting up…</> : <><Store size={16} />Launch my store</>}
              </button>
            </form>
          </div>
        </div>
      </main>
    )
  }

  // Choose path
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-black/5">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F] text-center">Welcome to Rounds</h1>
          <p className="text-black/40 mt-1.5 text-center text-sm">Are you setting up a new store or joining an existing one?</p>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={() => setStep('create')}
            className="flex items-center gap-4 p-5 bg-[#1D1D1F] text-white rounded-3xl text-left hover:bg-black transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <Store size={20} />
            </div>
            <div>
              <p className="font-bold text-base">Create my store</p>
              <p className="text-white/50 text-sm mt-0.5">Set up a new loyalty program</p>
            </div>
          </button>

          <button onClick={() => setStep('join')}
            className="flex items-center gap-4 p-5 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/90 text-left hover:bg-white/90 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-black/5 flex items-center justify-center shrink-0">
              <Users size={20} className="text-black/60" />
            </div>
            <div>
              <p className="font-bold text-base text-[#1D1D1F]">Join a store</p>
              <p className="text-black/40 text-sm mt-0.5">Request access as staff</p>
            </div>
          </button>
        </div>
      </div>
    </main>
  )
}
