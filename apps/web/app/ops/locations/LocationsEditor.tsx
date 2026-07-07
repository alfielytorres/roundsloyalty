'use client'

import { useState } from 'react'
import { Search, Check, MapPin } from 'lucide-react'

export interface VendorLoc {
  id: string
  name: string
  address: string
  phone: string
  lat: string
  lng: string
}

function Row({ v }: { v: VendorLoc }) {
  const [address, setAddress] = useState(v.address)
  const [phone, setPhone] = useState(v.phone)
  const [lat, setLat] = useState(v.lat)
  const [lng, setLng] = useState(v.lng)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true); setSaved(false); setError(null)
    try {
      const res = await fetch('/api/ops/vendor-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: v.id, address, phone, lat, lng }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || json?.error) { setError(json?.error ?? `Failed (${res.status})`); return }
      setSaved(true)
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  const hasPin = lat.trim() !== '' && lng.trim() !== ''

  return (
    <div className="glass p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="font-semibold text-[#1D1D1F] truncate">{v.name}</p>
        <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${hasPin ? 'bg-black/10 text-[#1D1D1F]' : 'bg-black/5 text-black/40'}`}>
          <MapPin size={11} /> {hasPin ? 'Pinned' : 'No pin'}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <input value={address} onChange={(e) => { setAddress(e.target.value); setSaved(false) }} placeholder="Address" className="dark-input text-sm" />
        <div className="grid grid-cols-3 gap-2">
          <input value={phone} onChange={(e) => { setPhone(e.target.value); setSaved(false) }} placeholder="Phone" className="dark-input text-sm" />
          <input value={lat} onChange={(e) => { setLat(e.target.value); setSaved(false) }} placeholder="Lat" inputMode="decimal" className="dark-input text-sm font-mono" />
          <input value={lng} onChange={(e) => { setLng(e.target.value); setSaved(false) }} placeholder="Lng" inputMode="decimal" className="dark-input text-sm font-mono" />
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={save} disabled={saving}
            className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-1.5 disabled:opacity-60">
            {saved ? <><Check size={14} /> Saved</> : saving ? 'Saving…' : 'Save'}
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>
    </div>
  )
}

export default function LocationsEditor({ vendors }: { vendors: VendorLoc[] }) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const filtered = query ? vendors.filter((v) => v.name.toLowerCase().includes(query)) : vendors

  return (
    <div>
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/25" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stores…" className="dark-input pl-10" />
      </div>
      {filtered.length === 0 ? (
        <p className="text-black/40 text-sm text-center py-12">No stores match “{q}”.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((v) => <Row key={v.id} v={v} />)}
        </div>
      )}
    </div>
  )
}
