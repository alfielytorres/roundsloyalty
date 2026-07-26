'use client'

import { useState } from 'react'
import QRCode from 'react-qr-code'
import { Plus, Link2, Store, Trash2, ExternalLink, Check, X, Copy } from 'lucide-react'
import { useToast } from '@/components/Toast'

export interface Stand {
  id: string
  token: string
  label: string | null
  vendor_id: string | null
  redirect_url: string | null
  created_at: string | null
}
export interface VendorOption { id: string; business_name: string }

export default function StandsClient({ initialStands, vendors }: { initialStands: Stand[]; vendors: VendorOption[] }) {
  const { show } = useToast()
  const [stands, setStands] = useState<Stand[]>(initialStands)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Stand | null>(null)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const vendorName = (id: string | null) => vendors.find(v => v.id === id)?.business_name

  async function create() {
    setCreating(true)
    const res = await fetch('/api/ops/stands', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) })
    setCreating(false)
    const data = await res.json()
    if (!res.ok) { show('error', data.error ?? 'Could not create'); return }
    setStands(s => [data.stand, ...s])
    setEditing(data.stand)
  }

  async function remove(id: string) {
    const res = await fetch(`/api/ops/stands?id=${id}`, { method: 'DELETE' })
    if (!res.ok) { show('error', 'Could not delete'); return }
    setStands(s => s.filter(x => x.id !== id))
    show('success', 'Stand deleted')
  }

  function standUrl(token: string) { return `${origin}/t/${token}` }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={create} disabled={creating}
          className="inline-flex items-center gap-2 btn-primary text-sm disabled:opacity-60">
          <Plus size={16} /> New stand
        </button>
      </div>

      {stands.length === 0 ? (
        <div className="glass px-6 py-14 text-center">
          <p className="text-black/40 font-medium">No stands yet</p>
          <p className="text-black/30 text-sm mt-1">Create one, then print its QR or write it to an NFC tag.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {stands.map(stand => (
            <div key={stand.id} className="glass">
              <div className="flex items-start gap-4">
                <div className="bg-white rounded-xl p-2 border border-black/5 shrink-0">
                  <QRCode value={standUrl(stand.token)} size={72} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#1D1D1F]">{stand.label || `Stand ${stand.token.slice(0, 6)}`}</p>
                  <button onClick={() => { navigator.clipboard?.writeText(standUrl(stand.token)); show('success', 'Link copied') }}
                    className="inline-flex items-center gap-1 text-xs text-black/40 hover:text-black/70 font-mono mt-0.5 transition-colors">
                    /t/{stand.token} <Copy size={11} />
                  </button>
                  <div className="mt-2">
                    {stand.redirect_url ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D1D1F] bg-black/5 rounded-full px-2.5 py-1 max-w-full">
                        <Link2 size={11} className="shrink-0" /> <span className="truncate">{stand.redirect_url}</span>
                      </span>
                    ) : stand.vendor_id ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/55 bg-black/5 rounded-full px-2.5 py-1">
                        <Store size={11} /> Weekends Club · {vendorName(stand.vendor_id) ?? 'store'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/35 bg-black/5 rounded-full px-2.5 py-1">
                        Weekends Club home (no store set)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a href={standUrl(stand.token)} target="_blank" title="Open"
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-black/40 hover:text-black/70 hover:bg-black/5 transition-colors">
                    <ExternalLink size={15} />
                  </a>
                  <button onClick={() => setEditing(stand)} title="Configure"
                    className="text-xs font-semibold rounded-xl px-3 py-2 border border-black/10 text-black/50 hover:border-black/25 hover:text-black/70 transition-colors">
                    Configure
                  </button>
                  <button onClick={() => remove(stand.id)} title="Delete"
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-black/30 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditStand
          stand={editing}
          vendors={vendors}
          onClose={() => setEditing(null)}
          onSaved={(updated) => { setStands(s => s.map(x => x.id === updated.id ? updated : x)); setEditing(null); show('success', 'Saved') }}
          onError={(m) => show('error', m)}
        />
      )}
    </>
  )
}

function EditStand({ stand, vendors, onClose, onSaved, onError }: {
  stand: Stand; vendors: VendorOption[]
  onClose: () => void; onSaved: (s: Stand) => void; onError: (m: string) => void
}) {
  const [label, setLabel] = useState(stand.label ?? '')
  const [vendorId, setVendorId] = useState(stand.vendor_id ?? '')
  const [redirect, setRedirect] = useState(stand.redirect_url ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch('/api/ops/stands', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: stand.id, label, vendor_id: vendorId || null, redirect_url: redirect }),
    })
    setSaving(false)
    const data = await res.json()
    if (!res.ok) { onError(data.error ?? 'Could not save'); return }
    onSaved({ ...stand, label: label.trim() || null, vendor_id: vendorId || null, redirect_url: redirect.trim() || null })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white/90 backdrop-blur-2xl border border-white/70 rounded-t-[28px] sm:rounded-[28px] shadow-[0_24px_80px_rgba(0,0,0,0.25)] z-10 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#1D1D1F]">Configure stand</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors"><X size={15} className="text-black/50" /></button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold tracking-widest uppercase text-black/35 mb-1.5 block">Label</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Chayo counter #1" className="dark-input" />
          </div>

          <div>
            <label className="text-xs font-bold tracking-widest uppercase text-black/35 mb-1.5 block">Custom link (optional)</label>
            <input value={redirect} onChange={e => setRedirect(e.target.value)} placeholder="https://…  — leave empty for default" className="dark-input" />
            <p className="text-[11px] text-black/35 mt-1.5 leading-relaxed">
              Set a link to send scans anywhere (a review page, menu, promo). Leave empty to use the Weekends Club default below.
            </p>
          </div>

          <div className={redirect.trim() ? 'opacity-40 pointer-events-none' : ''}>
            <label className="text-xs font-bold tracking-widest uppercase text-black/35 mb-1.5 block">Default store (Weekends Club)</label>
            <select value={vendorId} onChange={e => setVendorId(e.target.value)} className="dark-input">
              <option value="">Weekends Club home (no store)</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
            </select>
            <p className="text-[11px] text-black/35 mt-1.5">Where a scan goes when no custom link is set — the store&apos;s join / get-the-app page.</p>
          </div>

          <button onClick={save} disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 btn-primary text-sm disabled:opacity-60 mt-1">
            {saving ? 'Saving…' : <><Check size={16} /> Save</>}
          </button>
        </div>
      </div>
    </div>
  )
}
