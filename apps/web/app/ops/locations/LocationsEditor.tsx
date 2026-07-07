'use client'

import { useState } from 'react'
import { Search, Check, MapPin, Plus, Trash2 } from 'lucide-react'

export interface LocRow {
  id: string
  name: string
  address: string
  lat: string
  lng: string
}

export interface VendorGroup {
  id: string
  name: string
  locations: LocRow[]
}

async function post(body: Record<string, unknown>) {
  const res = await fetch('/api/ops/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || json?.error) throw new Error(json?.error ?? `Failed (${res.status})`)
  return json as { ok: true; id?: string }
}

function LocationRow({ loc, onRemove }: { loc: LocRow; onRemove: () => void }) {
  const [name, setName] = useState(loc.name)
  const [address, setAddress] = useState(loc.address)
  const [lat, setLat] = useState(loc.lat)
  const [lng, setLng] = useState(loc.lng)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasPin = lat.trim() !== '' && lng.trim() !== ''
  const dirty = () => setSaved(false)

  async function save() {
    setSaving(true); setSaved(false); setError(null)
    try { await post({ id: loc.id, name, address, lat, lng }); setSaved(true) }
    catch (e) { setError((e as Error).message) } finally { setSaving(false) }
  }
  async function del() {
    if (!confirm(`Delete location “${name}”?`)) return
    setSaving(true); setError(null)
    try { await post({ action: 'delete', id: loc.id }); onRemove() }
    catch (e) { setError((e as Error).message); setSaving(false) }
  }

  return (
    <div className="rounded-2xl bg-black/[0.02] border border-black/5 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input value={name} onChange={(e) => { setName(e.target.value); dirty() }} placeholder="Location name" className="dark-input text-sm flex-1" />
        <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${hasPin ? 'bg-black/10 text-[#1D1D1F]' : 'bg-amber-500/15 text-amber-700'}`}>
          <MapPin size={11} /> {hasPin ? 'On map' : 'No pin'}
        </span>
      </div>
      <input value={address} onChange={(e) => { setAddress(e.target.value); dirty() }} placeholder="Address" className="dark-input text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <input value={lat} onChange={(e) => { setLat(e.target.value); dirty() }} placeholder="Lat" inputMode="decimal" className="dark-input text-sm font-mono" />
        <input value={lng} onChange={(e) => { setLng(e.target.value); dirty() }} placeholder="Lng" inputMode="decimal" className="dark-input text-sm font-mono" />
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving}
          className="btn-primary text-sm py-1.5 px-4 inline-flex items-center gap-1.5 disabled:opacity-60">
          {saved ? <><Check size={14} /> Saved</> : saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={del} disabled={saving}
          className="text-xs font-medium text-black/40 hover:text-red-500 inline-flex items-center gap-1 disabled:opacity-40">
          <Trash2 size={13} /> Delete
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  )
}

function AddForm({ vendorId, onAdded }: { vendorId: string; onAdded: (l: LocRow) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add() {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true); setError(null)
    try {
      const res = await post({ vendorId, name, address, lat, lng })
      onAdded({ id: res.id as string, name, address, lat, lng })
      setName(''); setAddress(''); setLat(''); setLng(''); setOpen(false)
    } catch (e) { setError((e as Error).message) } finally { setSaving(false) }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/50 hover:text-black/80 rounded-xl px-3 py-2 border border-black/10 border-dashed hover:bg-black/5 transition-colors self-start">
        <Plus size={14} /> Add location
      </button>
    )
  }
  return (
    <div className="rounded-2xl border border-black/10 border-dashed p-3 flex flex-col gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Location name (e.g. Downtown)" className="dark-input text-sm" />
      <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className="dark-input text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Lat" inputMode="decimal" className="dark-input text-sm font-mono" />
        <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Lng" inputMode="decimal" className="dark-input text-sm font-mono" />
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={add} disabled={saving} className="btn-primary text-sm py-1.5 px-4 disabled:opacity-60">{saving ? 'Adding…' : 'Add'}</button>
        <button type="button" onClick={() => { setOpen(false); setError(null) }} className="text-xs font-medium text-black/40 hover:text-black/70">Cancel</button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  )
}

function VendorCard({ vendor }: { vendor: VendorGroup }) {
  const [locations, setLocations] = useState<LocRow[]>(vendor.locations)
  return (
    <div className="glass p-4 flex flex-col gap-3">
      <p className="font-semibold text-[#1D1D1F]">{vendor.name}</p>
      {locations.length === 0 && <p className="text-black/30 text-sm">No map locations yet.</p>}
      {locations.map((l) => (
        <LocationRow key={l.id} loc={l} onRemove={() => setLocations((cur) => cur.filter((x) => x.id !== l.id))} />
      ))}
      <AddForm vendorId={vendor.id} onAdded={(l) => setLocations((cur) => [...cur, l])} />
    </div>
  )
}

export default function LocationsEditor({ vendors }: { vendors: VendorGroup[] }) {
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
        <div className="flex flex-col gap-3">
          {filtered.map((v) => <VendorCard key={v.id} vendor={v} />)}
        </div>
      )}
    </div>
  )
}
