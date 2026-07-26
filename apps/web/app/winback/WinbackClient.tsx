'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Sparkles, Send, Clock, RotateCcw, TrendingUp, AlertTriangle, Undo2 } from 'lucide-react'
import Modal from '@/components/Modal'
import { useToast } from '@/components/Toast'

interface AtRiskRow {
  customer_id: string
  name: string | null
  last_visit: string
  days_since: number
  visits: number
  avg_gap_days: number | null
  last_contacted_at: string | null
}

interface WinbackStats {
  sent: number
  returned: number
  recovered_visits: number
}

const THRESHOLDS = [7, 10, 14, 30] as const

const firstNameOf = (name: string | null) => {
  const n = (name ?? '').trim().split(/\s+/)[0]
  return n && n.toLowerCase() !== 'anonymous' ? n : ''
}

const displayName = (name: string | null) => {
  const n = (name ?? '').trim()
  return n && n.toLowerCase() !== 'anonymous' ? n : 'Anonymous'
}

// Instant on-device draft so the composer is never empty. The /api/winback/draft
// route returns the same shape (and upgrades to an AI draft when a key is set).
function templateDraft(vendorName: string, name: string | null, daysSince: number) {
  const first = firstNameOf(name)
  const hi = first ? `Hi ${first}, ` : ''
  const store = vendorName || 'us'
  const title = `${vendorName || 'We'} miss${vendorName ? 'es' : ''} you 👋`.slice(0, 60)
  const body =
    `${hi}it's been ${daysSince} day${daysSince === 1 ? '' : 's'} since your last visit to ${store}. ` +
    `Your rounds are waiting — come back soon and pick up where you left off! ☕`
  return { title, body: body.slice(0, 280) }
}

function daysAgo(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

export default function WinbackClient({ vendorId, vendorName }: { vendorId: string; vendorName: string }) {
  const { show } = useToast()
  const supabase = useRef(
    createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
  ).current

  const [threshold, setThreshold] = useState<number>(10)
  const [rows, setRows] = useState<AtRiskRow[]>([])
  const [stats, setStats] = useState<WinbackStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Composer state
  const [selected, setSelected] = useState<AtRiskRow | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [aiDrafted, setAiDrafted] = useState(false)
  const [sending, setSending] = useState(false)
  const touched = useRef(false)
  const openFor = useRef<string | null>(null)

  const loadStats = useCallback(async () => {
    const { data } = await supabase.rpc('winback_stats', { p_vendor_id: vendorId })
    const s = Array.isArray(data) ? data[0] : data
    setStats((s as WinbackStats) ?? { sent: 0, returned: 0, recovered_visits: 0 })
  }, [supabase, vendorId])

  const loadRisk = useCallback(async (days: number) => {
    setLoading(true)
    const { data } = await supabase.rpc('at_risk_customers', { p_vendor_id: vendorId, p_threshold_days: days })
    setRows((data ?? []) as AtRiskRow[])
    setLoading(false)
  }, [supabase, vendorId])

  useEffect(() => { loadRisk(threshold) }, [threshold, loadRisk])
  useEffect(() => { loadStats() }, [loadStats])

  // Ask the route for a draft (AI when configured, template otherwise).
  const fetchDraft = useCallback(async (row: AtRiskRow) => {
    setDrafting(true)
    try {
      const res = await fetch('/api/winback/draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          vendorName,
          customerName: row.name,
          daysSince: row.days_since,
          avgGap: row.avg_gap_days,
        }),
      })
      if (!res.ok) return
      const d = (await res.json()) as { title: string; body: string; ai: boolean }
      // Don't clobber the store's edits, and ignore a stale response if they've
      // since opened a different customer.
      if (!touched.current && openFor.current === row.customer_id) {
        setTitle(d.title)
        setBody(d.body)
        setAiDrafted(d.ai)
      }
    } catch {
      // keep the instant template
    } finally {
      setDrafting(false)
    }
  }, [vendorName])

  function openComposer(row: AtRiskRow) {
    const t = templateDraft(vendorName, row.name, row.days_since)
    touched.current = false
    openFor.current = row.customer_id
    setSelected(row)
    setTitle(t.title)
    setBody(t.body)
    setAiDrafted(false)
    fetchDraft(row)
  }

  function closeComposer() {
    openFor.current = null
    setSelected(null)
  }

  async function send() {
    if (!selected) return
    if (!title.trim() || !body.trim()) { show('error', 'Add a title and message first.'); return }
    setSending(true)
    const { error } = await supabase.rpc('send_winback', {
      p_vendor_id: vendorId,
      p_customer_id: selected.customer_id,
      p_title: title.trim(),
      p_body: body.trim(),
    })
    setSending(false)
    if (error) { show('error', error.message || 'Could not send.'); return }
    show('success', `Win-back sent to ${displayName(selected.name)}.`)
    const nowIso = new Date().toISOString()
    setRows(rs => rs.map(r => r.customer_id === selected.customer_id ? { ...r, last_contacted_at: nowIso } : r))
    closeComposer()
    loadStats()
  }

  const recoveryRate = stats && stats.sent > 0 ? Math.round((stats.returned / stats.sent) * 100) : null

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-3xl mx-auto">
        <div className="mb-7">
          <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-0.5">{vendorName}</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Win-back</h1>
          <p className="text-black/40 text-sm mt-0.5">Spot customers slipping away and nudge them back with a push.</p>
        </div>

        {/* Impact */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass flex flex-col gap-2">
            <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center"><Send size={15} className="text-black/45" /></div>
            <div>
              <p className="text-3xl font-black text-[#1D1D1F] leading-none tabular-nums">{stats?.sent ?? '—'}</p>
              <p className="text-[12px] font-semibold text-black/55 mt-1.5">Sent</p>
            </div>
          </div>
          <div className="glass flex flex-col gap-2">
            <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center"><Undo2 size={15} className="text-black/45" /></div>
            <div>
              <p className="text-3xl font-black text-[#1D1D1F] leading-none tabular-nums">
                {stats?.returned ?? '—'}{recoveryRate !== null && <span className="text-base font-bold text-emerald-600"> · {recoveryRate}%</span>}
              </p>
              <p className="text-[12px] font-semibold text-black/55 mt-1.5">Came back</p>
            </div>
          </div>
          <div className="glass flex flex-col gap-2">
            <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center"><TrendingUp size={15} className="text-black/45" /></div>
            <div>
              <p className="text-3xl font-black text-[#1D1D1F] leading-none tabular-nums">{stats?.recovered_visits ?? '—'}</p>
              <p className="text-[12px] font-semibold text-black/55 mt-1.5">Recovered visits</p>
            </div>
          </div>
        </div>

        {/* Threshold */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-xs font-semibold text-black/40">Inactive for</span>
          {THRESHOLDS.map(d => (
            <button key={d} onClick={() => setThreshold(d)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors border ${
                threshold === d
                  ? 'bg-rounds text-white border-transparent'
                  : 'bg-white/70 text-black/40 border-black/10 hover:border-black/25 hover:text-black/60'
              }`}>
              {d}+ days
            </button>
          ))}
        </div>

        {loading ? (
          <div className="glass px-6 py-14 flex justify-center">
            <div className="w-5 h-5 border-2 border-black/15 border-t-black/50 rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="glass px-6 py-14 text-center">
            <Sparkles className="mx-auto text-black/20 mb-3" size={34} />
            <p className="text-black/45 font-medium">No one&apos;s slipping away</p>
            <p className="text-black/30 text-sm mt-1">No customers have been inactive for {threshold}+ days. Nice.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {rows.map(r => {
              const contactedDays = daysAgo(r.last_contacted_at)
              const name = displayName(r.name)
              return (
                <div key={r.customer_id} className="glass flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-black/8 flex items-center justify-center font-bold text-[#1D1D1F] shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#1D1D1F] text-sm truncate">{name}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/5 text-black/60 border border-black/10">
                          <AlertTriangle size={10} /> At risk
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-black/40 mt-0.5">
                        <span className="inline-flex items-center gap-1"><Clock size={11} />{r.days_since}d since visit</span>
                        <span className="inline-flex items-center gap-1"><RotateCcw size={11} />{r.visits} visit{r.visits === 1 ? '' : 's'}</span>
                        {r.avg_gap_days != null && <span className="hidden sm:inline">usually every {r.avg_gap_days}d</span>}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {contactedDays !== null && (
                      <p className="text-[11px] text-black/35 mb-1">Contacted {contactedDays === 0 ? 'today' : `${contactedDays}d ago`}</p>
                    )}
                    <button onClick={() => openComposer(r)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-xl px-3.5 py-2 bg-rounds hover:bg-rounds-hover text-white transition-colors">
                      <Sparkles size={14} /> {contactedDays !== null ? 'Again' : 'Win back'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-[11px] text-black/30 mt-4 leading-relaxed">
          Win-backs are sent as a push to the customer&apos;s Weekends Club app. We count it as recovered if they come back within 7 days.
        </p>
      </div>

      <Modal isOpen={!!selected} onClose={closeComposer} title="Send win-back">
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-black/8 flex items-center justify-center font-bold text-[#1D1D1F] shrink-0">
                {displayName(selected.name).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[#1D1D1F] leading-tight">{displayName(selected.name)}</p>
                <p className="text-black/40 text-xs">{selected.days_since}d since last visit · {selected.visits} visit{selected.visits === 1 ? '' : 's'}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold tracking-widest uppercase text-black/35">Push title</label>
                <button onClick={() => { touched.current = false; fetchDraft(selected) }} disabled={drafting}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rounds hover:opacity-70 disabled:opacity-40 transition-opacity">
                  <Sparkles size={12} className={drafting ? 'animate-pulse' : ''} /> {drafting ? 'Drafting…' : 'Redraft'}
                </button>
              </div>
              <input value={title} maxLength={120}
                onChange={e => { touched.current = true; setTitle(e.target.value) }}
                className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-black/30 transition-colors" />
            </div>

            <div>
              <label className="text-xs font-bold tracking-widest uppercase text-black/35 mb-1.5 block">Message</label>
              <textarea value={body} maxLength={280} rows={4}
                onChange={e => { touched.current = true; setBody(e.target.value) }}
                className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm text-[#1D1D1F] leading-relaxed focus:outline-none focus:border-black/30 transition-colors resize-none" />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[11px] text-black/30">{aiDrafted ? '✨ Drafted with AI' : 'Personalised draft — edit freely'}</span>
                <span className="text-[11px] text-black/30 tabular-nums">{body.length}/280</span>
              </div>
            </div>

            {/* Push preview */}
            <div className="rounded-2xl bg-black/[0.04] border border-black/5 px-4 py-3">
              <p className="text-[10px] font-bold tracking-widest uppercase text-black/25 mb-2">Preview</p>
              <div className="rounded-xl bg-white shadow-sm px-3.5 py-2.5">
                <p className="font-semibold text-[#1D1D1F] text-sm leading-tight truncate">{title || 'Push title'}</p>
                <p className="text-black/55 text-[13px] leading-snug mt-0.5 line-clamp-3">{body || 'Your message will appear here.'}</p>
              </div>
            </div>

            <button onClick={send} disabled={sending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3 font-bold text-sm bg-rounds hover:bg-rounds-hover text-white transition-colors disabled:opacity-60">
              {sending ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send size={15} />}
              {sending ? 'Sending…' : 'Send push'}
            </button>
          </div>
        )}
      </Modal>
    </main>
  )
}
