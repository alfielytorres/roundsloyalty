'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Megaphone, Clock, Plus, Pencil } from 'lucide-react'
import CampaignModal, { EditableCampaign } from './CampaignModal'

interface Campaign {
  id: string
  name: string
  round_value: number
  starts_at: string
  ends_at: string
  status: string
  customer_message: string | null
}

function campaignStatus(c: Campaign): 'live' | 'scheduled' | 'ended' | 'cancelled' {
  if (c.status === 'cancelled') return 'cancelled'
  const now = new Date()
  if (new Date(c.starts_at) <= now && new Date(c.ends_at) > now) return 'live'
  if (new Date(c.starts_at) > now) return 'scheduled'
  return 'ended'
}

const statusBadge = {
  live: 'bg-black/10 text-[#1D1D1F] border border-black/15',
  scheduled: 'bg-black/5 text-black/60 border border-black/10',
  ended: 'bg-black/5 text-black/30 border border-black/5',
  cancelled: 'bg-black/5 text-black/40 border border-black/10',
}

export default function CampaignsClient({ vendorId }: { vendorId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)

  const load = useCallback(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    supabase
      .from('round_campaigns')
      .select('id, name, round_value, starts_at, ends_at, status, customer_message')
      .eq('vendor_id', vendorId)
      .order('starts_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setCampaigns((data ?? []) as Campaign[]); setLoading(false) })
  }, [vendorId])

  useEffect(() => { load() }, [load])

  return (
    <>
      <div className="flex items-start justify-between mb-7">
        <div>
          <p className="text-xs tracking-widest uppercase text-black/30 font-semibold mb-0.5">Round Rewards</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Campaigns</h1>
          <p className="text-black/40 text-sm mt-0.5">Run bonus round events to reward loyal customers</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="mt-1 w-10 h-10 flex items-center justify-center bg-[#1D1D1F] hover:bg-black text-white rounded-full transition-colors shadow-sm shrink-0"
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
            const isLive = st === 'live'
            const editable = st === 'live' || st === 'scheduled'
            return (
              <div key={c.id}
                onClick={editable ? () => setEditing(c) : undefined}
                className={`glass group ${st === 'ended' || st === 'cancelled' ? 'opacity-55' : ''} ${editable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${statusBadge[st]}`}>
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </span>
                    <h3 className="font-bold text-[#1D1D1F] text-base mt-2 truncate">{c.name}</h3>
                    <p className="text-black/40 text-xs mt-0.5">
                      {new Date(c.starts_at).toLocaleDateString()} — {new Date(c.ends_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-4xl font-black text-[#1D1D1F] leading-none">{c.round_value}×</p>
                    <p className="text-black/30 text-xs tracking-widest uppercase mt-1">rounds</p>
                  </div>
                </div>
                {c.customer_message && (
                  <p className="text-black/40 text-sm italic mb-3 leading-relaxed">&ldquo;{c.customer_message}&rdquo;</p>
                )}
                {editable && (
                  <div className="flex items-center justify-between pt-3 border-t border-black/5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/35 group-hover:text-black/60 transition-colors">
                      <Pencil size={11} /> Tap to edit
                    </span>
                    {isLive ? (
                      <div className="flex items-center gap-3">
                        <span className="hidden sm:inline-flex items-center gap-1.5 text-black/45 text-xs font-medium">
                          <Clock size={11} />Ends {new Date(c.ends_at).toLocaleString()}
                        </span>
                        <form action="/api/campaigns/cancel" method="POST" onClick={(e) => e.stopPropagation()}>
                          <input type="hidden" name="campaign_id" value={c.id} />
                          <button type="submit"
                            className="text-xs font-semibold rounded-xl px-3 py-1.5 border border-black/10 text-black/40 hover:border-black/20 hover:text-black/60 transition-colors">
                            End campaign
                          </button>
                        </form>
                      </div>
                    ) : (
                      <form action="/api/campaigns/cancel" method="POST" onClick={(e) => e.stopPropagation()}>
                        <input type="hidden" name="campaign_id" value={c.id} />
                        <button type="submit"
                          className="text-xs font-semibold rounded-xl px-3 py-1.5 border border-black/10 text-black/40 hover:border-black/20 hover:text-black/60 transition-colors">
                          Cancel
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <CampaignModal vendorId={vendorId} isOpen={creating} onClose={() => setCreating(false)} />
      <CampaignModal vendorId={vendorId} isOpen={!!editing} onClose={() => setEditing(null)}
        campaign={editing as EditableCampaign | null} />
    </>
  )
}
