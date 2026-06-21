'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { PackageCheck, Clock, CheckCircle } from 'lucide-react'

interface Collection {
  id: string
  status: string
  collection_code: string
  selected_option: string | null
  requested_at: string
  reward_instances: Array<{ reward_name: string }> | null
  profiles: Array<{ display_name: string | null }> | null
}

function CollectionCard({ c, onAction }: { c: Collection; onAction: (id: string, action: 'ready' | 'collected') => void }) {
  const name = c.profiles?.[0]?.display_name ?? 'Customer'
  const rewardName = c.reward_instances?.[0]?.reward_name ?? 'Reward'
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
            className="flex-1 py-2 rounded-xl bg-[#1D1D1F] text-white text-xs font-bold hover:bg-black transition-colors">
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
  const [error, setError] = useState<string | null>(null)
  const [vendorId, setVendorId] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const fetchCollections = useCallback(async (vid: string) => {
    const { data } = await supabase
      .from('reward_collections')
      .select('id, status, collection_code, selected_option, requested_at, reward_instances(reward_name), profiles(display_name)')
      .eq('vendor_id', vid)
      .in('status', ['requested', 'ready', 'collected'])
      .order('requested_at', { ascending: false })
      .limit(100)
    if (data) setCollections(data as unknown as Collection[])
  }, [supabase])

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: staffRecord } = await supabase
          .from('vendor_staff')
          .select('vendor_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()
        if (staffRecord) {
          setVendorId(staffRecord.vendor_id)
          await fetchCollections(staffRecord.vendor_id)
        } else {
          const { data: vendor } = await supabase
            .from('vendors')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle()
          if (vendor) {
            setVendorId(vendor.id)
            await fetchCollections(vendor.id)
          } else {
            setError('No vendor found for your account.')
          }
        }
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [supabase, fetchCollections])

  useEffect(() => {
    if (!vendorId) return
    const interval = setInterval(() => fetchCollections(vendorId), 30000)
    return () => clearInterval(interval)
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

  if (loading) {
    return (
      <main className="px-5 pt-10 pb-32">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <p className="text-black/30 text-xs font-semibold tracking-widest uppercase mb-0.5">Loading…</p>
            <h1 className="text-2xl font-bold text-[#1D1D1F]">Collections</h1>
          </div>
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-black/10 border-t-black/60 rounded-full animate-spin" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <p className="text-black/30 text-xs font-semibold tracking-widest uppercase mb-0.5">Collections</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Reward Collections</h1>
          <p className="text-black/40 text-sm mt-0.5">Auto-refreshes every 30s</p>
        </div>

        {error && (
          <div className="glass mb-4 border-black/10">
            <p className="text-black/60 text-sm">{error}</p>
          </div>
        )}
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
                      {(c.profiles?.[0]?.display_name ?? 'C').charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-[#1D1D1F] text-sm">{c.profiles?.[0]?.display_name ?? 'Customer'}</span>
                  </div>
                  <p className="text-black/50 text-xs">{c.reward_instances?.[0]?.reward_name ?? 'Reward'}</p>
                  <p className="text-black/30 text-xs font-mono mt-0.5">{c.collection_code}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
