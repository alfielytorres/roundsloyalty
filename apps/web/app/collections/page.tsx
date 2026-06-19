'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { PackageCheck, Clock, CheckCircle, Loader2 } from 'lucide-react'

interface Collection {
  id: string
  status: string
  collection_code: string
  selected_option: string | null
  requested_at: string
  reward_instances: {
    reward_name: string
  } | null
  profiles: {
    display_name: string | null
  } | null
}

function CollectionCard({
  c,
  onAction,
}: {
  c: Collection
  onAction: (id: string, action: 'ready' | 'collected') => void
}) {
  const name = c.profiles?.display_name ?? 'Customer'
  const rewardName = c.reward_instances?.reward_name ?? 'Reward'

  return (
    <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-[#F0EDE6] flex items-center justify-center font-bold text-[#374151] text-sm">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-[#111111] text-sm">{name}</p>
          <p className="text-[#9CA3AF] text-xs font-mono">{c.collection_code}</p>
        </div>
      </div>
      <p className="text-[#374151] font-medium text-sm mb-1">{rewardName}</p>
      {c.selected_option && (
        <p className="text-[#6B7280] text-xs mb-2">{c.selected_option}</p>
      )}
      <p className="text-[#9CA3AF] text-xs mb-3">
        {new Date(c.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
      <div className="flex gap-2">
        {c.status === 'requested' && (
          <button
            onClick={() => onAction(c.id, 'ready')}
            className="flex-1 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors"
          >
            Mark Ready
          </button>
        )}
        {(c.status === 'requested' || c.status === 'ready') && (
          <button
            onClick={() => onAction(c.id, 'collected')}
            className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
          >
            Collected
          </button>
        )}
      </div>
    </div>
  )
}

function ColumnHeader({ icon: Icon, title, count, color }: { icon: React.ElementType; title: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={16} style={{ color }} />
      <h2 className="font-bold text-[#111111] text-sm">{title}</h2>
      <span className="ml-auto text-xs font-bold text-[#9CA3AF] bg-[#F0EDE6] px-2 py-0.5 rounded-full">{count}</span>
    </div>
  )
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    return url && key ? createBrowserClient(url, key) : null
  }, [])

  const fetchCollections = useCallback(async (vid: string) => {
    if (!supabase) throw new Error('Supabase is not configured.')

    const { data, error: fetchError } = await supabase
      .from('reward_collections')
      .select(`
        id, status, collection_code, selected_option, requested_at,
        reward_instances(reward_name),
        profiles(display_name)
      `)
      .eq('vendor_id', vid)
      .in('status', ['requested', 'ready', 'collected'])
      .order('requested_at', { ascending: false })
      .limit(100)

    if (fetchError) throw fetchError
    setCollections((data ?? []) as unknown as Collection[])
  }, [supabase])

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    const client = supabase

    async function init() {
      try {
        const { data: { user }, error: authError } = await client.auth.getUser()
        if (authError || !user) throw new Error('Please sign in again.')

        const { data: staffRecord } = await client
          .from('vendor_staff')
          .select('vendor_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()

        let resolvedVendorId = staffRecord?.vendor_id ?? null
        if (!resolvedVendorId) {
          const { data: ownedVendor, error: ownerError } = await client
            .from('vendors')
            .select('id')
            .eq('owner_id', user.id)
            .limit(1)
            .maybeSingle()
          if (ownerError) throw ownerError
          resolvedVendorId = ownedVendor?.id ?? null
        }

        if (!resolvedVendorId) throw new Error('No vendor account was found.')

        setVendorId(resolvedVendorId)
        await fetchCollections(resolvedVendorId)
      } catch (initError) {
        setError(initError instanceof Error ? initError.message : 'Collections could not be loaded.')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [supabase, fetchCollections])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!vendorId) return
    const interval = setInterval(() => {
      void fetchCollections(vendorId).catch((refreshError) => {
        setError(refreshError instanceof Error ? refreshError.message : 'Collections could not be refreshed.')
      })
    }, 30000)
    return () => clearInterval(interval)
  }, [vendorId, fetchCollections])

  async function handleAction(id: string, action: 'ready' | 'collected') {
    setError(null)
    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }
    const { error: actionError } = action === 'ready'
      ? await supabase.rpc('mark_collection_ready', { p_collection_id: id })
      : await supabase.rpc('complete_reward_collection', { p_collection_id: id })

    if (actionError) {
      setError(actionError.message)
      return
    }

    if (vendorId) {
      try {
        await fetchCollections(vendorId)
      } catch (refreshError) {
        setError(refreshError instanceof Error ? refreshError.message : 'Collections could not be refreshed.')
      }
    }
  }

  const requested = collections.filter((c) => c.status === 'requested')
  const ready = collections.filter((c) => c.status === 'ready')
  const collected = collections.filter((c) => c.status === 'collected').slice(0, 20)

  if (loading) {
    return (
      <main className="px-6 pt-10 pb-32">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <p className="text-[#9CA3AF] text-xs font-semibold tracking-widest uppercase mb-1">Loading…</p>
            <h1 className="text-3xl font-extrabold text-[#111111]">Collections</h1>
          </div>
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="text-[#E8805A] animate-spin" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-[#9CA3AF] text-xs font-semibold tracking-widest uppercase mb-1">Collections</p>
          <h1 className="text-3xl font-extrabold text-[#111111]">Reward Collections</h1>
          <p className="text-[#6B7280] mt-1">Click-and-collect board — auto-refreshes every 30s</p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Requested */}
          <div>
            <ColumnHeader icon={Clock} title="Requested" count={requested.length} color="#D97706" />
            <div className="flex flex-col gap-3">
              {requested.length === 0 && (
                <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 text-center text-[#9CA3AF] text-sm">
                  No requests
                </div>
              )}
              {requested.map((c) => (
                <CollectionCard key={c.id} c={c} onAction={handleAction} />
              ))}
            </div>
          </div>

          {/* Ready */}
          <div>
            <ColumnHeader icon={PackageCheck} title="Ready" count={ready.length} color="#2563EB" />
            <div className="flex flex-col gap-3">
              {ready.length === 0 && (
                <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 text-center text-[#9CA3AF] text-sm">
                  Nothing ready
                </div>
              )}
              {ready.map((c) => (
                <CollectionCard key={c.id} c={c} onAction={handleAction} />
              ))}
            </div>
          </div>

          {/* Collected */}
          <div>
            <ColumnHeader icon={CheckCircle} title="Collected" count={collected.length} color="#16A34A" />
            <div className="flex flex-col gap-3">
              {collected.length === 0 && (
                <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 text-center text-[#9CA3AF] text-sm">
                  None yet today
                </div>
              )}
              {collected.map((c) => (
                <div key={c.id} className="bg-white border border-[#E8E2D9] rounded-2xl p-4 shadow-sm opacity-70">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-[#F0EDE6] flex items-center justify-center font-bold text-[#374151] text-xs">
                      {(c.profiles?.display_name ?? 'C').charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-[#111111] text-sm">{c.profiles?.display_name ?? 'Customer'}</span>
                  </div>
                  <p className="text-[#374151] text-xs">{c.reward_instances?.reward_name ?? 'Reward'}</p>
                  <p className="text-[#9CA3AF] text-xs font-mono mt-0.5">{c.collection_code}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
