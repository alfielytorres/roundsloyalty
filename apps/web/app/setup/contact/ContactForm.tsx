'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, MapPin, ArrowRight } from 'lucide-react'
import AddressAutocomplete from '../../settings/AddressAutocomplete'

export default function ContactForm({ phone, address, lat, lng }: { phone: string; address: string; lat?: number; lng?: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/onboarding/contact', { method: 'POST', body: fd })
      const json = await res.json().catch(() => null)
      if (!res.ok || json?.error) { setError(json?.error ?? 'Something went wrong.'); return }
      router.push('/setup'); router.refresh()
    } catch { setError('Network error. Please try again.') } finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <section className="glass rounded-3xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center"><Phone size={16} className="text-black/50" /></div>
          <h3 className="text-sm font-bold text-[#1D1D1F]">Contact phone</h3>
        </div>
        <input name="phone" type="tel" required defaultValue={phone} placeholder="e.g. +61 400 000 000" className="w-full dark-input" />
      </section>

      <section className="glass rounded-3xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center"><MapPin size={16} className="text-black/50" /></div>
          <h3 className="text-sm font-bold text-[#1D1D1F]">Store address</h3>
        </div>
        <AddressAutocomplete defaultValue={address} defaultLat={lat} defaultLng={lng} />
        <p className="text-black/30 text-xs">Pick a suggestion to place it on the map. If yours doesn’t appear, type it manually and save — our team can pin the map location for you.</p>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={loading}
        className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60">
        {loading ? 'Saving…' : <>Save &amp; continue <ArrowRight size={16} /></>}
      </button>
    </form>
  )
}
