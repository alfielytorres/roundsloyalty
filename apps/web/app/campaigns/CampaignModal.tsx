'use client'

import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import Modal from '@/components/Modal'

export interface EditableCampaign {
  id: string
  name: string
  round_value: number
  starts_at: string
  ends_at: string
  customer_message: string | null
  status: string
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fmtRange(s: string, e: string): string {
  if (!s || !e) return 'Pick a time'
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
  return `${new Date(s).toLocaleString(undefined, opts)} → ${new Date(e).toLocaleString(undefined, opts)}`
}

const PRESETS = [
  { label: 'Double weekend', icon: '🎉', value: 2, name: 'Double Round Weekend', kind: 'weekend' as const },
  { label: 'Happy hour', icon: '🍹', value: 2, name: 'Happy Hour', kind: 'tonight' as const },
  { label: 'Triple day', icon: '🔥', value: 3, name: 'Triple Round Day', kind: 'week' as const },
]

export default function CampaignModal({
  vendorId, isOpen, onClose, campaign,
}: {
  vendorId: string
  isOpen: boolean
  onClose: () => void
  campaign?: EditableCampaign | null
}) {
  const editing = !!campaign
  // A live campaign has already started — its start time is locked.
  const liveLocked = editing && new Date(campaign!.starts_at) <= new Date()

  const [name, setName] = useState('')
  const [value, setValue] = useState(2)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [message, setMessage] = useState('')

  // Sync form whenever the modal opens (for a new campaign or a different one).
  useEffect(() => {
    if (!isOpen) return
    if (campaign) {
      setName(campaign.name)
      setValue(campaign.round_value)
      setStart(toLocalInput(new Date(campaign.starts_at)))
      setEnd(toLocalInput(new Date(campaign.ends_at)))
      setMessage(campaign.customer_message ?? '')
    } else {
      setName(''); setValue(2); setStart(''); setEnd(''); setMessage('')
    }
  }, [isOpen, campaign])

  function setWindow(startD: Date, endD: Date) { setStart(toLocalInput(startD)); setEnd(toLocalInput(endD)) }

  function quick(kind: 'tonight' | 'weekend' | 'week') {
    const now = new Date()
    if (kind === 'tonight') {
      const e = new Date(now); e.setHours(now.getHours() + 3, 0, 0, 0)
      setWindow(now, e)
    } else if (kind === 'weekend') {
      const sat = new Date(now)
      const untilSat = (6 - sat.getDay() + 7) % 7
      sat.setDate(sat.getDate() + (untilSat === 0 && sat.getDay() !== 6 ? 7 : untilSat)); sat.setHours(9, 0, 0, 0)
      const sun = new Date(sat); sun.setDate(sat.getDate() + 1); sun.setHours(21, 0, 0, 0)
      setWindow(sat, sun)
    } else {
      const e = new Date(now); e.setDate(now.getDate() + 7)
      setWindow(now, e)
    }
  }

  function applyPreset(p: typeof PRESETS[number]) {
    setValue(p.value)
    if (!name.trim()) setName(p.name)
    quick(p.kind)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit campaign' : 'Create campaign'}>
      <form action={editing ? '/api/campaigns/update' : '/api/campaigns/create'} method="POST" className="flex flex-col gap-4">
        <input type="hidden" name="vendor_id" value={vendorId} />
        {editing && <input type="hidden" name="campaign_id" value={campaign!.id} />}
        <input type="hidden" name="round_value" value={value} />
        <input type="hidden" name="starts_at" value={start} />
        <input type="hidden" name="ends_at" value={end} />

        {/* Live preview */}
        <div className="rounded-2xl p-4 text-white shadow-lg" style={{ background: 'linear-gradient(135deg,#1D1D1F,#3a3a40)' }}>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/60"><Zap size={12} /> Bonus rounds</div>
          <p className="text-lg font-bold mt-1 truncate">{name || 'Your campaign'}</p>
          <div className="flex items-end justify-between mt-1 gap-3">
            <span className="text-5xl font-black leading-none">{value}×</span>
            <span className="text-[11px] text-white/60 text-right leading-tight">{fmtRange(start, end)}</span>
          </div>
        </div>

        {/* Quick start presets — only for new campaigns */}
        {!editing && (
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button key={p.label} type="button" onClick={() => applyPreset(p)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1D1D1F] bg-white/70 border border-black/10 rounded-full pl-2.5 pr-3 py-1.5 hover:bg-white hover:border-black/20 hover:scale-[1.03] transition-all">
                <span className="text-base">{p.icon}</span>{p.label}
              </button>
            ))}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Campaign name</label>
          <input name="name" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Double Round Weekend" className="dark-input w-full" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Round multiplier</label>
          <div className="grid grid-cols-4 gap-2">
            {[2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => setValue(n)}
                className={`py-3 rounded-2xl font-black text-lg border-2 transition-all ${value === n ? 'bg-[#1D1D1F] text-white border-[#1D1D1F] scale-[1.03]' : 'border-black/10 text-black/50 hover:bg-black/5'}`}>{n}×</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">When</label>
          {!liveLocked && (
            <div className="flex flex-wrap gap-2 mb-2">
              {[{ k: 'tonight' as const, l: 'Next 3 hours' }, { k: 'weekend' as const, l: 'This weekend' }, { k: 'week' as const, l: 'Next 7 days' }].map(q => (
                <button key={q.k} type="button" onClick={() => quick(q.k)}
                  className="text-xs font-semibold text-black/55 bg-white/60 border border-black/10 rounded-full px-3 py-1.5 hover:bg-white hover:border-black/20 transition-colors">{q.l}</button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="block text-[11px] font-semibold text-black/35 mb-1">Starts</span>
              <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} required readOnly={liveLocked}
                className={`dark-input w-full min-w-0 ${liveLocked ? 'opacity-60 cursor-not-allowed' : ''}`} />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-black/35 mb-1">Ends</span>
              <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} required className="dark-input w-full min-w-0" />
            </div>
          </div>
          {liveLocked && <p className="text-[11px] text-black/35 mt-1.5">This campaign is already live — only the end time can be changed.</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Customer message (optional)</label>
          <textarea name="customer_message" value={message} onChange={e => setMessage(e.target.value)} rows={2} placeholder="Shown to customers during the campaign" className="dark-input w-full resize-none" />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-black/10 text-black/50 font-semibold text-sm hover:bg-black/5 transition-colors">
            Cancel
          </button>
          <button type="submit"
            className="flex-1 py-3 rounded-2xl bg-[#1D1D1F] text-white font-semibold text-sm hover:bg-black transition-colors">
            {editing ? 'Save changes' : 'Create campaign'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
