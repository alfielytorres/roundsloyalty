'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { PackageCheck, Clock, CheckCircle, RefreshCw } from 'lucide-react'

interface Collection {
  id: string
  status: string
  collection_code: string
  selected_option: string | null
  requested_at: string
  reward_instances: { reward_name: string } | null
  profiles: { display_name: string | null } | null  // via customer_id FK
}

function CollectionCard({ c, onAction }: { c: Collection; onAction: (id: string, action: 'ready' | 'collected') => void }) {
  const profile = Array.isArray(c.profiles) ? (c.profiles as Array<{ display_name: string | null }>)[0] : c.profiles
  const rewardInst = Array.isArray(c.reward_instances) ? (c.reward_instances as Array<{ reward_name: string }>)[0] : c.reward_instances
  const name = profile?.display_name ?? 'Customer'
  const rewardName = rewardInst?.reward_name ?? 'Reward'
  return (
    <div className="glass">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center font-bold text-[#1D1D1F] text-sm">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-[#1D1D1F] text-sm">{name}</p>
          <p className="text-black/35 text-xs font-mono">{c.collection_code}</p>
        </div>
      </div>
      <p className="text-[#1D1D1F] font-medium text-sm mb-1">{rewardName}</p>
      {c.selected_option && <p className="text-black/40 text-xs mb-2">{c.selected_option}</p>}
      <p className="text-black/30 text-xs mb-3">
        {new Date(c.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
      <div className="flex gap-2">
        {c.status === 'requested' && (
          <button onClick={() => onAction(c.id, 'ready')}
            className="flex-1 py-2 rounded-xl bg-black/5 text-black/70 border border-black/10 text-xs font-bold hover:bg-black/10 transition-colors">
            Mark Ready
          </button>
        )}
        {(c.status === 'requested' || c.status === 'ready') && (
          <button onClick={() => onAction(c.id, 'collected')}
            className="flex-1 py-2 rounded-xl bg-rounds text-white text-xs font-bold hover:bg-rounds-hover transition-colors">
            Collected
          </button>
        )}
      </div>
    </div>
  )
}

function ColumnHeader({ icon: Icon, title, count }: { icon: React.ElementType; title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={15} className="text-black/40" />
      <h2 className="font-bold text-[#1D1D1F] text-sm">{title}</h2>
      <span className="ml-auto text-xs font-bold text-black/40 bg-black/5 px-2 py-0.5 rounded-full">{count}</span>
    </div>
  )
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vendorId, setVendorId] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const fetchCollections = useCallback(async (vid: string) => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('reward_collections')
        .select('id, status, collection_code, selected_option, requested_at, reward_instances(reward_name), profiles!reward_collections_customer_id_fkey(display_name)')
        .eq('vendor_id', vid)
        .in('status', ['requested', 'ready', 'collected'])
        .order('requested_at', { ascending: false })
        .limit(100)

      if (fetchErr) {
        setError(`Query error: ${fetchErr.message}`)
        console.error('Collections fetch error:', fetchErr)
        return
      }

      setCollections((data ?? []) as unknown as Collection[])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(`Exception: ${msg}`)
      console.error('Collections exception:', e)
    }
  }, [supabase])

  useEffect(() => {
    async function init() {
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) { setError('Not signed in'); return }

        // Try vendor_staff first
        const { data: staffRecord } = await supabase
          .from('vendor_staff')
          .select('vendor_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()

        let vid: string | null = staffRecord?.vendor_id ?? null

        if (!vid) {
          const { data: vendor, error: vendorErr } = await supabase
            .from('vendors')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle()
          if (vendorErr) { setError(`Vendor lookup error: ${vendorErr.message}`); return }
          vid = vendor?.id ?? null
        }

        if (!vid) { setError('No vendor found for your account.'); return }

        setVendorId(vid)
        await fetchCollections(vid)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [supabase, fetchCollections])

  const refresh = useCallback(async () => {
    if (!vendorId) return
    setRefreshing(true)
    await fetchCollections(vendorId)
    setRefreshing(false)
  }, [vendorId, fetchCollections])

  async function handleAction(id: string, action: 'ready' | 'collected') {
    if (action === 'ready') {
      await supabase.rpc('mark_collection_ready', { p_collection_id: id })
    } else {
      await supabase.rpc('complete_reward_collection', { p_collection_id: id })
    }
    if (vendorId) await fetchCollections(vendorId)
  }

  const requested = collections.filter((c) => c.status === 'requested')
  const ready = collections.filter((c) => c.status === 'ready')
  const collected = collections.filter((c) => c.status === 'collected').slice(0, 20)

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <p className="text-black/30 text-xs font-semibold tracking-widest uppercase mb-0.5">Collections</p>
            <h1 className="text-2xl font-bold text-[#1D1D1F]">Reward Collections</h1>
            <p className="text-black/40 text-sm mt-0.5">Hand over rewards customers have claimed</p>
          </div>
          <button onClick={refresh} disabled={loading || refreshing}
            className="mt-1 w-10 h-10 flex items-center justify-center rounded-full border border-black/10 text-black/50 hover:text-black/70 hover:border-black/25 hover:bg-black/5 transition-colors disabled:opacity-50 shrink-0"
            title="Refresh">
            <RefreshCw size={17} className={loading || refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="glass mb-4 border-red-200 bg-red-50">
            <p className="text-red-600 text-sm font-mono">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="glass px-6 py-14 flex justify-center">
            <div className="w-5 h-5 border-2 border-black/15 border-t-black/50 rounded-full animate-spin" />
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <ColumnHeader icon={Clock} title="Requested" count={requested.length} />
            <div className="flex flex-col gap-3">
              {requested.length === 0 && <div className="glass text-center text-black/30 text-sm py-6">No requests</div>}
              {requested.map((c) => <CollectionCard key={c.id} c={c} onAction={handleAction} />)}
            </div>
          </div>
          <div>
            <ColumnHeader icon={PackageCheck} title="Ready" count={ready.length} />
            <div className="flex flex-col gap-3">
              {ready.length === 0 && <div className="glass text-center text-black/30 text-sm py-6">Nothing ready</div>}
              {ready.map((c) => <CollectionCard key={c.id} c={c} onAction={handleAction} />)}
            </div>
          </div>
          <div>
            <ColumnHeader icon={CheckCircle} title="Collected" count={collected.length} />
            <div className="flex flex-col gap-3">
              {collected.length === 0 && <div className="glass text-center text-black/30 text-sm py-6">None yet today</div>}
              {collected.map((c) => (
                <div key={c.id} className="glass opacity-60">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center font-bold text-[#1D1D1F] text-xs">
                      {(() => {
                        const p = Array.isArray(c.profiles) ? (c.profiles as Array<{ display_name: string | null }>)[0] : c.profiles
                        return (p?.display_name ?? 'C').charAt(0).toUpperCase()
                      })()}
                    </div>
                    <span className="font-semibold text-[#1D1D1F] text-sm">
                      {(() => {
                        const p = Array.isArray(c.profiles) ? (c.profiles as Array<{ display_name: string | null }>)[0] : c.profiles
                        return p?.display_name ?? 'Customer'
                      })()}
                    </span>
                  </div>
                  <p className="text-black/50 text-xs">
                    {(() => {
                      const r = Array.isArray(c.reward_instances) ? (c.reward_instances as Array<{ reward_name: string }>)[0] : c.reward_instances
                      return r?.reward_name ?? 'Reward'
                    })()}
                  </p>
                  <p className="text-black/30 text-xs font-mono mt-0.5">{c.collection_code}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>
    </main>
  )
}
