'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { MapPin, Plus, Trash2 } from 'lucide-react'
import Spinner from '@/components/Spinner'
import AddressAutocomplete from './AddressAutocomplete'

interface Location {
  id: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
}

export default function LocationsManager({ vendorId }: { vendorId: string }) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [addr, setAddr] = useState<{ address: string; lat: number | null; lng: number | null }>({ address: '', lat: null, lng: null })
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0) // remount the autocomplete to clear it after add

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const load = useCallback(() => {
    supabase.from('vendor_locations')
      .select('id, name, address, lat, lng')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: true })
      .then(({ data }) => { setLocations((data ?? []) as Location[]); setLoading(false) })
  }, [supabase, vendorId])

  useEffect(() => { load() }, [load])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    setAdding(true)
    await supabase.from('vendor_locations').insert({
      vendor_id: vendorId,
      name: n,
      address: addr.address.trim() || null,
      lat: addr.lat,
      lng: addr.lng,
    })
    setName(''); setAddr({ address: '', lat: null, lng: null }); setFormKey(k => k + 1)
    setAdding(false)
    load()
  }

  async function remove(id: string) {
    setBusy(id)
    await supabase.from('vendor_locations').delete().eq('id', id)
    setBusy(null)
    load()
  }

  return (
    <div className="glass mb-3">
      <div className="flex items-center gap-2 mb-1">
        <MapPin size={15} className="text-black/40" />
        <h2 className="text-sm font-semibold text-[#1D1D1F]">Locations</h2>
      </div>
      <p className="text-black/40 text-xs mb-4">One loyalty card works across all your locations. Assign NFC devices to a location to track where stamps happen.</p>

      {loading ? (
        <div className="flex justify-center py-4"><Spinner size={18} className="text-black/40" /></div>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {locations.length === 0 && <p className="text-black/30 text-sm">No locations yet — add your first below.</p>}
          {locations.map(l => (
            <div key={l.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-black/[0.02] border border-black/5">
              <div className="min-w-0">
                <p className="font-semibold text-[#1D1D1F] text-sm truncate">{l.name}</p>
                {l.address && <p className="text-black/35 text-xs truncate">{l.address}</p>}
                {l.lat != null && l.lng != null
                  ? <p className="inline-flex items-center gap-1 text-[11px] text-rounds font-medium mt-0.5"><MapPin size={11} />On the map</p>
                  : <p className="text-[11px] text-black/30 mt-0.5">No address — won&apos;t appear on the map</p>}
              </div>
              <button onClick={() => remove(l.id)} disabled={busy === l.id}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-black/30 hover:text-red-500 hover:bg-red-500/5 transition-colors disabled:opacity-40"
                title="Remove location">
                {busy === l.id ? <Spinner size={14} /> : <Trash2 size={15} />}
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={add} className="flex flex-col gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Location name (e.g. Downtown)" className="dark-input" />
        <AddressAutocomplete key={formKey} onChange={setAddr} placeholder="Search address (for the map)" />
        <button type="submit" disabled={adding || !name.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rounds text-white font-semibold text-sm hover:bg-rounds-hover transition-colors disabled:opacity-40 self-start">
          {adding ? <Spinner size={14} /> : <Plus size={16} />}Add location
        </button>
      </form>
    </div>
  )
}
