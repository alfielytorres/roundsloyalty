'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Award, Phone, MapPin, Minus, Plus, ArrowRight } from 'lucide-react'
import AddressAutocomplete from '../settings/AddressAutocomplete'

interface Props {
  programName: string
  rounds: number
  rewardName: string
  phone: string
  address: string
  lat?: number
  lng?: number
}

export default function SetupWizard(p: Props) {
  const router = useRouter()
  const [rounds, setRounds] = useState(p.rounds || 10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('rounds_required', String(rounds))
    try {
      const res = await fetch('/api/onboarding/complete', { method: 'POST', body: fd })
      const json = await res.json().catch(() => null)
      if (!res.ok || json?.error) { setError(json?.error ?? 'Something went wrong.'); return }
      router.push('/dashboard'); router.refresh()
    } catch { setError('Network error. Please try again.') } finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {/* Program */}
      <section className="glass rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center"><Award size={16} className="text-black/50" /></div>
          <h3 className="text-sm font-bold text-[#1D1D1F]">Your loyalty program</h3>
        </div>
        <div>
          <label className="block text-[11px] font-semibold tracking-widest uppercase text-black/40 mb-1.5">Program name</label>
          <input name="program_name" required defaultValue={p.programName} placeholder="e.g. Coffee Club" className="w-full dark-input" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold tracking-widest uppercase text-black/40 mb-1.5">Rounds for a reward</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setRounds(v => Math.max(1, v - 1))} className="w-10 h-10 flex items-center justify-center rounded-xl border border-black/10 text-black/60 hover:bg-black/5"><Minus size={16} /></button>
              <span className="w-12 text-center text-xl font-bold text-[#1D1D1F] tabular-nums">{rounds}</span>
              <button type="button" onClick={() => setRounds(v => Math.min(10, v + 1))} className="w-10 h-10 flex items-center justify-center rounded-xl border border-black/10 text-black/60 hover:bg-black/5"><Plus size={16} /></button>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-widest uppercase text-black/40 mb-1.5">Reward</label>
            <input name="reward_name" required defaultValue={p.rewardName} placeholder="e.g. Free coffee" className="w-full dark-input" />
          </div>
        </div>
      </section>

      {/* Phone */}
      <section className="glass rounded-3xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center"><Phone size={16} className="text-black/50" /></div>
          <h3 className="text-sm font-bold text-[#1D1D1F]">Contact phone</h3>
        </div>
        <input name="phone" type="tel" required defaultValue={p.phone} placeholder="e.g. +61 400 000 000" className="w-full dark-input" />
      </section>

      {/* Address */}
      <section className="glass rounded-3xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center"><MapPin size={16} className="text-black/50" /></div>
          <h3 className="text-sm font-bold text-[#1D1D1F]">Store address</h3>
        </div>
        <AddressAutocomplete defaultValue={p.address} defaultLat={p.lat} defaultLng={p.lng} />
        <p className="text-black/30 text-xs">Pick a suggestion to place it on the map. If yours doesn’t appear, type it manually and save — our team can pin the map location for you.</p>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={loading}
        className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60">
        {loading ? 'Finishing…' : <>Finish setup &amp; open dashboard <ArrowRight size={16} /></>}
      </button>
    </form>
  )
}
