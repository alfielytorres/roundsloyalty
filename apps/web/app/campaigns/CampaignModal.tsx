'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Zap, Send, CheckCheck, MailOpen, Clock, Calendar } from 'lucide-react'
import Modal from '@/components/Modal'
import SubmitButton from '@/components/SubmitButton'

// A fully-styled date/time field: we render our own formatted display and lay a
// transparent native datetime-local input on top, so tapping it opens the native
// picker while the ugly/inconsistent native rendering stays invisible.
function DateTimeField({ label, value, onChange, disabled }: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean
}) {
  const display = value
    ? new Date(value).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'Pick a date & time'
  return (
    <div>
      <span className="block text-[11px] font-semibold text-black/35 mb-1">{label}</span>
      <div className={`relative ${disabled ? 'opacity-60' : ''}`}>
        <div className="dark-input w-full flex items-center justify-between gap-2">
          <span className={`text-sm truncate ${value ? 'text-[#1D1D1F]' : 'text-black/25'}`}>{display}</span>
          <Calendar size={15} className="text-black/30 shrink-0" />
        </div>
        <input
          type="datetime-local"
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          aria-label={label}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
      </div>
    </div>
  )
}

// Mirrors fanout_campaign_notifications() in migration 025 so the preview
// matches the push the customer actually receives.
function notifPreview(
  vendorName: string, name: string, value: number, start: string, end: string, message: string,
  type: 'standard' | 'birthday' = 'standard',
): { title: string; body: string } {
  const trimmed = message.trim()
  if (type === 'birthday') {
    const title = `${vendorName || 'A store'} 🎂 Happy birthday!`
    if (trimmed) return { title, body: trimmed }
    const body = `Happy birthday from ${vendorName || 'us'}! ` +
      (value > 1 ? `Enjoy ${value}× rounds this week.` : 'Come celebrate with us.')
    return { title, body }
  }
  const title = value > 1 ? `${vendorName || 'Your store'}: ${value}× rounds!` : (vendorName || 'Your store')
  if (trimmed) return { title, body: trimmed }
  const fmt = (s: string) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  const startsNow = !!start && new Date(start) <= new Date()
  const when = startsNow ? `now through ${fmt(end)}` : `starting ${fmt(start)}`
  if (value > 1) return { title, body: `${name || 'Your campaign'} — earn ${value}× rounds ${when}.` }
  return { title, body: `${name || 'Your campaign'} — ${when}.` }
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
  campaign_type?: string | null
  birthday_window_days?: number | null
}

const BIRTHDAY_WINDOWS = [
  { v: 0, label: 'On the day' },
  { v: 3, label: '3 days before' },
  { v: 7, label: 'A week before' },
  { v: 31, label: 'Their birthday month' },
]

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
            <span className="text-[11px] font-bold tracking-tight text-black/45 uppercase">Weekends Club</span>
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
  vendorId, vendorName, isOpen, onClose, campaign, stats, readOnly, activeMemberCount, birthdayExists,
}: {
  vendorId: string
  vendorName: string
  isOpen: boolean
  onClose: () => void
  campaign?: EditableCampaign | null
  stats?: CampaignStats | null
  readOnly?: boolean
  activeMemberCount?: number
  birthdayExists?: boolean
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
  const [campaignType, setCampaignType] = useState<'standard' | 'birthday'>('standard')
  const [birthdayWindow, setBirthdayWindow] = useState(7)

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
      setCampaignType(campaign.campaign_type === 'birthday' ? 'birthday' : 'standard')
      setBirthdayWindow(campaign.birthday_window_days ?? 7)
    } else {
      const [ds, de] = defaultWindow()
      setName(''); setValue(2); setStart(ds); setEnd(de); setMessage(''); setNotifyMode('on_start')
      setCampaignType('standard'); setBirthdayWindow(7)
    }
  }, [isOpen, campaign])

  // Birthday templates run as a standing year-long rule; they don't use a visible
  // time window or the mass-blast notify modes.
  const isBirthday = campaignType === 'birthday'
  const submitStart = isBirthday ? toLocalInput(new Date()) : start
  const submitEnd = isBirthday
    ? toLocalInput((() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d })())
    : end
  const submitNotify = isBirthday ? 'none' : notifyMode

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
        <input type="hidden" name="starts_at" value={submitStart} />
        <input type="hidden" name="ends_at" value={submitEnd} />
        <input type="hidden" name="notify_mode" value={submitNotify} />
        <input type="hidden" name="campaign_type" value={campaignType} />
        <input type="hidden" name="birthday_window_days" value={isBirthday ? birthdayWindow : 0} />

        {/* Live preview */}
        <div className="rounded-2xl p-4 text-white shadow-lg" style={{ background: 'linear-gradient(135deg,#1D1D1F,#3a3a40)' }}>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/60">
            {isBirthday ? <>🎂 Birthday reward</> : <><Zap size={12} /> {value > 1 ? 'Bonus rounds' : 'Announcement'}</>}
          </div>
          <p className="text-lg font-bold mt-1 truncate">{name || (isBirthday ? 'Birthday treat' : 'Your campaign')}</p>
          <div className="flex items-end justify-between mt-1 gap-3">
            <span className="text-5xl font-black leading-none">{value > 1 ? `${value}×` : (isBirthday ? '🎁' : '📣')}</span>
            <span className="text-[11px] text-white/60 text-right leading-tight">
              {isBirthday ? `Around each customer's birthday` : fmtRange(start, end)}
            </span>
          </div>
        </div>

        {/* Notification analytics for an existing campaign */}
        {editing && <NotificationStats stats={stats} campaign={campaign!} activeMemberCount={activeMemberCount} />}

        {/* Campaign type */}
        <div>
          <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setCampaignType('standard')}
              className={`py-2.5 px-2 rounded-xl text-sm font-semibold border-2 transition-all ${!isBirthday ? 'bg-rounds text-white border-rounds' : 'border-black/10 text-black/50 hover:bg-black/5'}`}>
              📣 Announcement
            </button>
            <button type="button" disabled={!!birthdayExists && !editing} onClick={() => setCampaignType('birthday')}
              className={`py-2.5 px-2 rounded-xl text-sm font-semibold border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${isBirthday ? 'bg-rounds text-white border-rounds' : 'border-black/10 text-black/50 hover:bg-black/5'}`}>
              🎂 Birthday
            </button>
          </div>
          <p className="text-[11px] text-black/40 mt-1.5">
            {birthdayExists && !editing && !isBirthday
              ? 'You already have a birthday campaign — edit that one to change it.'
              : isBirthday
                ? 'A standing template — each customer is automatically wished around their birthday.'
                : 'A one-time announcement to your customers over a time window.'}
          </p>
        </div>

        {/* Quick start presets — only for new standard campaigns */}
        {!editing && !isBirthday && (
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
          <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">{isBirthday ? 'Reward name' : 'Campaign name'}</label>
          <input name="name" value={name} onChange={e => setName(e.target.value)} required placeholder={isBirthday ? 'e.g. Birthday Treat' : 'e.g. Double Round Weekend'} className="dark-input w-full" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Bonus rounds {isBirthday ? '(optional)' : ''}</label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => setValue(n)}
                className={`py-3 rounded-2xl font-black text-base border-2 transition-all ${value === n ? 'bg-rounds text-white border-rounds scale-[1.03]' : 'border-black/10 text-black/50 hover:bg-black/5'}`}>
                {n === 1 ? 'None' : `${n}×`}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-black/40 mt-1.5">
            {value > 1
              ? (isBirthday ? `Customers earn ${value}× rounds during their birthday window.` : `Customers earn ${value}× rounds during the campaign.`)
              : 'No bonus — this just sends an announcement.'}
          </p>
        </div>

        {isBirthday ? (
          <div>
            <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Birthday window</label>
            <div className="grid grid-cols-2 gap-2">
              {BIRTHDAY_WINDOWS.map(w => (
                <button key={w.v} type="button" onClick={() => setBirthdayWindow(w.v)}
                  className={`py-2.5 px-2 rounded-xl text-sm font-semibold border-2 transition-all ${birthdayWindow === w.v ? 'bg-rounds text-white border-rounds' : 'border-black/10 text-black/50 hover:bg-black/5'}`}>
                  {w.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-black/40 mt-1.5">How close to their birthday the wish (and any bonus) kicks in.</p>
          </div>
        ) : (
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
              <DateTimeField label="Starts" value={start} onChange={setStart} disabled={liveLocked} />
              <DateTimeField label="Ends" value={end} onChange={setEnd} />
            </div>
            {liveLocked && <p className="text-[11px] text-black/35 mt-1.5">This campaign is already live — only the end time can be changed.</p>}
          </div>
        )}

        {/* Announcement timing — standard campaigns only (birthday notifies per customer) */}
        {!isBirthday && (
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
                      className={`py-2.5 px-1 rounded-xl text-xs font-semibold border-2 transition-all ${notifyMode === o.v ? 'bg-rounds text-white border-rounds' : 'border-black/10 text-black/50 hover:bg-black/5'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-black/40 mt-1.5">{NOTIFY_OPTIONS.find(o => o.v === notifyMode)?.hint}</p>
              </>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">{isBirthday ? 'Birthday message (optional)' : 'Customer message (optional)'}</label>
          <textarea name="customer_message" value={message} onChange={e => setMessage(e.target.value)} rows={2} placeholder={isBirthday ? 'e.g. Happy birthday! Free slice on us 🎂' : 'Used as the push notification text'} className="dark-input w-full resize-none" />
        </div>

        {/* Live preview of the push the customer will receive */}
        {submitNotify !== 'none' || isBirthday
          ? <NotifPreviewCard {...notifPreview(vendorName, name, value, start, end, message, campaignType)} />
          : <p className="text-[11px] text-black/35">No push will be sent for this campaign.</p>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-black/10 text-black/50 font-semibold text-sm hover:bg-black/5 transition-colors">
            Cancel
          </button>
          <SubmitButton pendingText={editing ? 'Saving…' : 'Creating…'}
            className="flex-1 py-3 rounded-2xl bg-rounds text-white font-semibold text-sm hover:bg-rounds-hover transition-colors disabled:opacity-60">
            {editing ? 'Save changes' : 'Create campaign'}
          </SubmitButton>
        </div>
      </form>
    </Modal>
  )
}
