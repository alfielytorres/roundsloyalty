'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Zap, Send, CheckCheck, MailOpen, Clock } from 'lucide-react'
import Modal from '@/components/Modal'

// Mirrors fanout_campaign_notifications() in migration 025 so the preview
// matches the push the customer actually receives.
function notifPreview(
  vendorName: string, name: string, value: number, start: string, end: string, message: string,
): { title: string; body: string } {
  const title = `${vendorName || 'Your store'}: ${value}× rounds!`
  const trimmed = message.trim()
  if (trimmed) return { title, body: trimmed }
  const fmt = (s: string) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  const startsNow = !!start && new Date(start) <= new Date()
  const when = startsNow ? `now through ${fmt(end)}` : `starting ${fmt(start)}`
  return { title, body: `${name || 'Your campaign'} — earn ${value}× rounds ${when}.` }
}

export interface CampaignStats {
  recipients: number
  delivered: number
  opened: number
  failed: number
  pending: number
}

export interface EditableCampaign {
  id: string
  name: string
  round_value: number
  starts_at: string
  ends_at: string
  customer_message: string | null
  status: string
  notify_mode?: string | null
  notified_at?: string | null
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// A sensible default window for a brand-new campaign so the date fields are
// never empty (an empty iOS datetime-local renders as a blank, broken-looking box).
function defaultWindow(): [string, string] {
  const s = new Date(); s.setMinutes(0, 0, 0); s.setHours(s.getHours() + 1)
  const e = new Date(s); e.setDate(e.getDate() + 7)
  return [toLocalInput(s), toLocalInput(e)]
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

const NOTIFY_OPTIONS = [
  { v: 'on_start', label: 'When it starts', hint: 'Customers are notified the moment the campaign goes live.' },
  { v: 'immediate', label: 'Right away', hint: 'Customers are notified as soon as you save this campaign.' },
  { v: 'none', label: "Don't notify", hint: 'No push is sent — the bonus just runs quietly.' },
]

function FunnelRow({ icon, label, value, total, color }: {
  icon: React.ReactNode; label: string; value: number; total: number; color: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="flex items-center gap-1.5 font-semibold text-[#1D1D1F]">{icon}{label}</span>
        <span className="text-black/45 font-medium tabular-nums">{value}<span className="text-black/25"> · {pct}%</span></span>
      </div>
      <div className="h-2.5 rounded-full bg-black/5 overflow-hidden">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(pct, value > 0 ? 4 : 0)}%`, background: color }} />
      </div>
    </div>
  )
}

function NotificationStats({ stats, campaign, activeMemberCount }: {
  stats?: CampaignStats | null; campaign: EditableCampaign; activeMemberCount?: number
}) {
  const notified = !!campaign.notified_at
  const recipients = stats?.recipients ?? 0

  // Nothing sent yet.
  if (!notified || recipients === 0) {
    const mode = campaign.notify_mode ?? 'on_start'
    return (
      <div className="rounded-2xl border border-black/8 bg-black/[0.02] px-4 py-3.5">
        <p className="text-xs font-bold tracking-widest uppercase text-black/35 mb-1">Notifications</p>
        <p className="text-sm text-black/55">
          {mode === 'none'
            ? 'No announcement will be sent for this campaign.'
            : mode === 'immediate'
              ? 'An announcement will be sent as soon as you save.'
              : `${activeMemberCount ?? 'Your'} ${activeMemberCount === 1 ? 'customer' : 'customers'} will be notified when it goes live.`}
        </p>
      </div>
    )
  }

  const openRate = recipients > 0 ? Math.round((stats!.opened / recipients) * 100) : 0
  return (
    <div className="rounded-2xl border border-black/8 bg-white px-4 py-4">
      <div className="flex items-end justify-between mb-3">
        <p className="text-xs font-bold tracking-widest uppercase text-black/35">Notifications</p>
        <div className="text-right">
          <p className="text-2xl font-black text-[#1D1D1F] leading-none">{openRate}%</p>
          <p className="text-[10px] tracking-widest uppercase text-black/30 mt-0.5">open rate</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <FunnelRow icon={<Send size={13} className="text-black/45" />} label="Sent" value={recipients} total={recipients} color="#1D1D1F" />
        <FunnelRow icon={<CheckCheck size={13} className="text-black/45" />} label="Delivered" value={stats!.delivered} total={recipients} color="#6b7280" />
        <FunnelRow icon={<MailOpen size={13} className="text-emerald-600" />} label="Opened" value={stats!.opened} total={recipients} color="#10b981" />
      </div>
      {(stats!.pending > 0 || stats!.failed > 0) && (
        <div className="flex flex-wrap gap-2 mt-3.5 pt-3 border-t border-black/5">
          {stats!.pending > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-black/45 bg-black/5 rounded-full px-2.5 py-1">
              <Clock size={11} />{stats!.pending} queued
            </span>
          )}
          {stats!.failed > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500/80 bg-red-500/8 rounded-full px-2.5 py-1">
              {stats!.failed} failed
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function NotifPreviewCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-black/[0.04] border border-black/8 p-3">
      <p className="text-[10px] font-bold tracking-widest uppercase text-black/30 mb-2">What customers see</p>
      <div className="rounded-2xl bg-white shadow-sm border border-black/5 px-3 py-2.5 flex gap-3">
        <Image src="/logo.svg" alt="" width={36} height={36} unoptimized className="rounded-lg shrink-0 self-start" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold tracking-tight text-black/45 uppercase">Rounds</span>
            <span className="text-[11px] text-black/30 shrink-0">now</span>
          </div>
          <p className="font-semibold text-[#1D1D1F] text-sm leading-snug mt-0.5 break-words">{title}</p>
          <p className="text-black/55 text-sm leading-snug break-words">{body}</p>
        </div>
      </div>
    </div>
  )
}

export default function CampaignModal({
  vendorId, vendorName, isOpen, onClose, campaign, stats, readOnly, activeMemberCount,
}: {
  vendorId: string
  vendorName: string
  isOpen: boolean
  onClose: () => void
  campaign?: EditableCampaign | null
  stats?: CampaignStats | null
  readOnly?: boolean
  activeMemberCount?: number
}) {
  const editing = !!campaign
  // A live campaign has already started — its start time is locked.
  const liveLocked = editing && new Date(campaign!.starts_at) <= new Date()
  const alreadyNotified = editing && !!campaign!.notified_at

  const [name, setName] = useState('')
  const [value, setValue] = useState(2)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [message, setMessage] = useState('')
  const [notifyMode, setNotifyMode] = useState('on_start')

  // Sync form whenever the modal opens (for a new campaign or a different one).
  useEffect(() => {
    if (!isOpen) return
    if (campaign) {
      setName(campaign.name)
      setValue(campaign.round_value)
      setStart(toLocalInput(new Date(campaign.starts_at)))
      setEnd(toLocalInput(new Date(campaign.ends_at)))
      setMessage(campaign.customer_message ?? '')
      setNotifyMode(campaign.notify_mode ?? 'on_start')
    } else {
      const [ds, de] = defaultWindow()
      setName(''); setValue(2); setStart(ds); setEnd(de); setMessage(''); setNotifyMode('on_start')
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

  // Read-only view (ended / cancelled): just the recap + the notification funnel.
  if (readOnly && campaign) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Campaign">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl p-4 text-white shadow-lg" style={{ background: 'linear-gradient(135deg,#1D1D1F,#3a3a40)' }}>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/60"><Zap size={12} /> Bonus rounds</div>
            <p className="text-lg font-bold mt-1 truncate">{campaign.name}</p>
            <div className="flex items-end justify-between mt-1 gap-3">
              <span className="text-5xl font-black leading-none">{campaign.round_value}×</span>
              <span className="text-[11px] text-white/60 text-right leading-tight">{fmtRange(campaign.starts_at, campaign.ends_at)}</span>
            </div>
          </div>
          {(campaign.notify_mode ?? 'on_start') !== 'none' && (
            <NotifPreviewCard {...notifPreview(
              vendorName, campaign.name, campaign.round_value,
              toLocalInput(new Date(campaign.starts_at)), toLocalInput(new Date(campaign.ends_at)),
              campaign.customer_message ?? '',
            )} />
          )}
          <NotificationStats stats={stats} campaign={campaign} activeMemberCount={activeMemberCount} />
          <button type="button" onClick={onClose}
            className="py-3 rounded-2xl border border-black/10 text-black/50 font-semibold text-sm hover:bg-black/5 transition-colors">
            Close
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit campaign' : 'Create campaign'}>
      <form action={editing ? '/api/campaigns/update' : '/api/campaigns/create'} method="POST" className="flex flex-col gap-4">
        <input type="hidden" name="vendor_id" value={vendorId} />
        {editing && <input type="hidden" name="campaign_id" value={campaign!.id} />}
        <input type="hidden" name="round_value" value={value} />
        <input type="hidden" name="starts_at" value={start} />
        <input type="hidden" name="ends_at" value={end} />
        <input type="hidden" name="notify_mode" value={notifyMode} />

        {/* Live preview */}
        <div className="rounded-2xl p-4 text-white shadow-lg" style={{ background: 'linear-gradient(135deg,#1D1D1F,#3a3a40)' }}>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/60"><Zap size={12} /> Bonus rounds</div>
          <p className="text-lg font-bold mt-1 truncate">{name || 'Your campaign'}</p>
          <div className="flex items-end justify-between mt-1 gap-3">
            <span className="text-5xl font-black leading-none">{value}×</span>
            <span className="text-[11px] text-white/60 text-right leading-tight">{fmtRange(start, end)}</span>
          </div>
        </div>

        {/* Notification analytics for an existing campaign */}
        {editing && <NotificationStats stats={stats} campaign={campaign!} activeMemberCount={activeMemberCount} />}

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

        {/* Announcement timing — store chooses when customers get the push */}
        <div>
          <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Notify customers</label>
          {alreadyNotified ? (
            <p className="text-sm text-black/55 bg-black/[0.03] border border-black/8 rounded-xl px-3.5 py-2.5">
              ✓ Customers have already been notified for this campaign.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {NOTIFY_OPTIONS.map(o => (
                  <button key={o.v} type="button" onClick={() => setNotifyMode(o.v)}
                    className={`py-2.5 px-1 rounded-xl text-xs font-semibold border-2 transition-all ${notifyMode === o.v ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]' : 'border-black/10 text-black/50 hover:bg-black/5'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-black/40 mt-1.5">{NOTIFY_OPTIONS.find(o => o.v === notifyMode)?.hint}</p>
            </>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Customer message (optional)</label>
          <textarea name="customer_message" value={message} onChange={e => setMessage(e.target.value)} rows={2} placeholder="Used as the push notification text" className="dark-input w-full resize-none" />
        </div>

        {/* Live preview of the push the customer will receive */}
        {notifyMode !== 'none'
          ? <NotifPreviewCard {...notifPreview(vendorName, name, value, start, end, message)} />
          : <p className="text-[11px] text-black/35">No push will be sent for this campaign.</p>}

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
