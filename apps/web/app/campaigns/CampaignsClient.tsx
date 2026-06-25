'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Megaphone, Clock, Plus, Pencil, Send, MailOpen } from 'lucide-react'
import CampaignModal, { EditableCampaign, CampaignStats } from './CampaignModal'
import SubmitButton from '@/components/SubmitButton'

interface Campaign {
  id: string
  name: string
  round_value: number
  starts_at: string
  ends_at: string
  status: string
  customer_message: string | null
  notify_mode: string | null
  notified_at: string | null
  campaign_type: string | null
  birthday_window_days: number | null
}

function campaignStatus(c: Campaign): 'live' | 'scheduled' | 'ended' | 'cancelled' | 'active' {
  if (c.status === 'cancelled') return 'cancelled'
  const now = new Date()
  // Birthday templates are simply on (active) until cancelled or their long
  // active period ends — they don't "start" on a single date.
  if (c.campaign_type === 'birthday') {
    return new Date(c.ends_at) > now ? 'active' : 'ended'
  }
  if (new Date(c.starts_at) <= now && new Date(c.ends_at) > now) return 'live'
  if (new Date(c.starts_at) > now) return 'scheduled'
  return 'ended'
}

const statusBadge: Record<string, string> = {
  live: 'bg-black/10 text-[#1D1D1F] border border-black/15',
  active: 'bg-black/10 text-[#1D1D1F] border border-black/15',
  scheduled: 'bg-black/5 text-black/60 border border-black/10',
  ended: 'bg-black/5 text-black/30 border border-black/5',
  cancelled: 'bg-black/5 text-black/40 border border-black/10',
}

const EMPTY_STATS: CampaignStats = { recipients: 0, delivered: 0, opened: 0, failed: 0, pending: 0 }

export default function CampaignsClient({ vendorId, vendorName }: { vendorId: string; vendorName: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [statsMap, setStatsMap] = useState<Record<string, CampaignStats>>({})
  const [memberCount, setMemberCount] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Campaign | null>(null)

  const load = useCallback(async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Announce any "on_start" campaigns that just went live, and wish any
    // customers whose birthday is now inside an active birthday template's window.
    await Promise.all([
      supabase.rpc('process_due_campaign_notifications', { p_vendor_id: vendorId }),
      supabase.rpc('process_due_birthday_notifications', { p_vendor_id: vendorId }),
    ])

    const [campaignsRes, notifsRes, memberRes] = await Promise.all([
      supabase.from('round_campaigns')
        .select('id, name, round_value, starts_at, ends_at, status, customer_message, notify_mode, notified_at, campaign_type, birthday_window_days')
        .eq('vendor_id', vendorId)
        .order('starts_at', { ascending: false })
        .limit(50),
      supabase.from('customer_notifications')
        .select('campaign_id, status, read_at')
        .eq('vendor_id', vendorId)
        .not('campaign_id', 'is', null),
      supabase.from('customer_vendor_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('vendor_id', vendorId).eq('status', 'active'),
    ])

    const map: Record<string, CampaignStats> = {}
    for (const n of (notifsRes.data ?? []) as { campaign_id: string; status: string; read_at: string | null }[]) {
      const s = map[n.campaign_id] ?? { ...EMPTY_STATS }
      s.recipients++
      if (n.status === 'delivered' || n.status === 'sent') s.delivered++
      if (n.status === 'failed') s.failed++
      if (n.status === 'pending') s.pending++
      if (n.read_at) s.opened++
      map[n.campaign_id] = s
    }

    setCampaigns((campaignsRes.data ?? []) as Campaign[])
    setStatsMap(map)
    setMemberCount(memberRes.count ?? undefined)
    setLoading(false)
  }, [vendorId])

  useEffect(() => { load() }, [load])

  return (
    <>
      <div className="flex items-start justify-between mb-7">
        <div>
          <p className="text-sm tracking-tight text-black/30 font-bold mb-0.5">Rounds</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Campaigns</h1>
          <p className="text-black/40 text-sm mt-0.5">Run bonus round events to reward loyal customers</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="mt-1 w-10 h-10 flex items-center justify-center bg-rounds hover:bg-rounds-hover text-white rounded-full transition-colors shadow-sm shrink-0"
          title="New campaign">
          <Plus size={20} />
        </button>
      </div>

      {loading ? (
        <div className="glass px-6 py-14 flex justify-center">
          <div className="w-5 h-5 border-2 border-black/15 border-t-black/50 rounded-full animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="glass px-6 py-14 text-center">
          <Megaphone className="mx-auto text-black/20 mb-3" size={36} />
          <p className="text-black/40 font-medium">No campaigns yet</p>
          <p className="text-black/30 text-sm mt-1">Create your first campaign to boost engagement</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {campaigns.map((c) => {
            const st = campaignStatus(c)
            const isLive = st === 'live' || st === 'active'
            const editable = st === 'live' || st === 'scheduled' || st === 'active'
            const cs = statsMap[c.id]
            const isBirthday = c.campaign_type === 'birthday'
            return (
              <div key={c.id}
                onClick={() => setSelected(c)}
                className={`glass group cursor-pointer hover:shadow-md transition-shadow ${st === 'ended' || st === 'cancelled' ? 'opacity-70' : ''}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${statusBadge[st]}`}>
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </span>
                      {isBirthday && (
                        <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-black/5 text-black/60 border border-black/10">🎂 Birthday</span>
                      )}
                    </div>
                    <h3 className="font-bold text-[#1D1D1F] text-base mt-2 truncate">{c.name}</h3>
                    <p className="text-black/40 text-xs mt-0.5">
                      {isBirthday
                        ? `Around each customer's birthday${(c.birthday_window_days ?? 0) > 0 ? ` (±${c.birthday_window_days}d)` : ''}`
                        : `${new Date(c.starts_at).toLocaleDateString()} — ${new Date(c.ends_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {c.round_value > 1 ? (
                      <>
                        <p className="text-4xl font-black text-[#1D1D1F] leading-none">{c.round_value}×</p>
                        <p className="text-black/30 text-xs tracking-widest uppercase mt-1">rounds</p>
                      </>
                    ) : (
                      <p className="text-3xl leading-none">{isBirthday ? '🎁' : '📣'}</p>
                    )}
                  </div>
                </div>
                {c.customer_message && (
                  <p className="text-black/40 text-sm italic mb-3 leading-relaxed">&ldquo;{c.customer_message}&rdquo;</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-black/5 gap-3">
                  {/* Notification mini-stats */}
                  {cs && cs.recipients > 0 ? (
                    <div className="flex items-center gap-3 text-xs font-semibold text-black/45 min-w-0">
                      <span className="inline-flex items-center gap-1"><Send size={11} />{cs.recipients} sent</span>
                      <span className="inline-flex items-center gap-1 text-emerald-600"><MailOpen size={11} />{cs.opened} opened</span>
                    </div>
                  ) : isBirthday ? (
                    <span className="text-xs text-black/35 font-medium">Wishes customers on their birthday</span>
                  ) : c.notify_mode === 'none' ? (
                    <span className="text-xs text-black/30 font-medium">No notification</span>
                  ) : (
                    <span className="text-xs text-black/35 font-medium">Notifies on launch</span>
                  )}

                  <div className="flex items-center gap-3 shrink-0">
                    {editable && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/35 group-hover:text-black/60 transition-colors">
                        <Pencil size={11} /> Edit
                      </span>
                    )}
                    {isLive && (
                      <form action="/api/campaigns/cancel" method="POST" onClick={(e) => e.stopPropagation()}>
                        <input type="hidden" name="campaign_id" value={c.id} />
                        <SubmitButton
                          className="text-xs font-semibold rounded-xl px-3 py-1.5 border border-black/10 text-black/40 hover:border-black/20 hover:text-black/60 transition-colors disabled:opacity-60">
                          End
                        </SubmitButton>
                      </form>
                    )}
                    {st === 'scheduled' && (
                      <form action="/api/campaigns/cancel" method="POST" onClick={(e) => e.stopPropagation()}>
                        <input type="hidden" name="campaign_id" value={c.id} />
                        <SubmitButton
                          className="text-xs font-semibold rounded-xl px-3 py-1.5 border border-black/10 text-black/40 hover:border-black/20 hover:text-black/60 transition-colors disabled:opacity-60">
                          Cancel
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CampaignModal vendorId={vendorId} vendorName={vendorName} isOpen={creating} onClose={() => setCreating(false)}
        activeMemberCount={memberCount}
        birthdayExists={campaigns.some(c => c.campaign_type === 'birthday' && c.status !== 'cancelled' && new Date(c.ends_at) > new Date())} />
      <CampaignModal
        vendorId={vendorId}
        vendorName={vendorName}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        campaign={selected as EditableCampaign | null}
        stats={selected ? statsMap[selected.id] : undefined}
        readOnly={selected ? (campaignStatus(selected) === 'ended' || campaignStatus(selected) === 'cancelled') : false}
        activeMemberCount={memberCount}
      />
    </>
  )
}
