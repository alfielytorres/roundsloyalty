'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Bell, PackageCheck } from 'lucide-react'

interface RequestRow {
  id: string
  requested_at: string
  reward_instances: { reward_name: string } | { reward_name: string }[] | null
  profiles: { display_name: string | null } | { display_name: string | null }[] | null
}

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v)

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

export default function NotificationsBell() {
  const supabase = useRef(
    createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
  ).current

  const [vendorId, setVendorId] = useState<string | null>(null)
  const [items, setItems] = useState<RequestRow[]>([])
  const [open, setOpen] = useState(false)

  const load = useCallback(async (vid: string) => {
    const { data } = await supabase
      .from('reward_collections')
      .select('id, requested_at, reward_instances(reward_name), profiles!reward_collections_customer_id_fkey(display_name)')
      .eq('vendor_id', vid)
      .eq('status', 'requested')
      .order('requested_at', { ascending: false })
      .limit(20)
    setItems((data ?? []) as unknown as RequestRow[])
  }, [supabase])

  // Resolve the current user's vendor (staff first, then owned), then load + subscribe.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let interval: ReturnType<typeof setInterval> | null = null
    let cleanupFocus: (() => void) | null = null
    let cancelled = false

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: staff } = await supabase
        .from('vendor_staff').select('vendor_id').eq('user_id', user.id).eq('status', 'active').maybeSingle()
      let vid: string | null = staff?.vendor_id ?? null
      if (!vid) {
        const { data: owned } = await supabase.from('vendors').select('id').eq('owner_id', user.id).maybeSingle()
        vid = owned?.id ?? null
      }
      if (!vid || cancelled) return
      const resolved = vid
      setVendorId(resolved)
      await load(resolved)

      // Live updates — Supabase Realtime honours RLS, so only this vendor's rows arrive.
      const { data: sess } = await supabase.auth.getSession()
      if (sess.session) supabase.realtime.setAuth(sess.session.access_token)
      channel = supabase
        .channel(`collections:${resolved}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'reward_collections', filter: `vendor_id=eq.${resolved}` },
          () => load(resolved))
        .subscribe()

      // Fallbacks in case realtime is unavailable.
      const onFocus = () => load(resolved)
      window.addEventListener('focus', onFocus)
      interval = setInterval(() => load(resolved), 30_000)
      cleanupFocus = () => window.removeEventListener('focus', onFocus)
    }

    init()
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
      if (interval) clearInterval(interval)
      if (cleanupFocus) cleanupFocus()
    }
  }, [supabase, load])

  if (!vendorId) return null
  const count = items.length

  return (
    <div className="fixed top-2 right-3 z-50">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/85 backdrop-blur-xl border border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.10)] text-black/55 hover:text-black/80 transition-colors"
      >
        <Bell size={18} strokeWidth={2} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold tabular-nums">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] z-50 rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-black/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
              <p className="font-bold text-[#1D1D1F] text-sm">Collection requests</p>
              {count > 0 && <span className="text-xs font-bold text-black/40 bg-black/5 px-2 py-0.5 rounded-full">{count}</span>}
            </div>

            {count === 0 ? (
              <div className="px-4 py-8 text-center">
                <PackageCheck size={26} className="mx-auto text-black/20 mb-2" />
                <p className="text-black/40 text-sm font-medium">You&apos;re all caught up</p>
                <p className="text-black/30 text-xs mt-0.5">New requests show up here in real time.</p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-black/5">
                {items.map((it) => {
                  const name = one(it.profiles)?.display_name ?? 'A customer'
                  const reward = one(it.reward_instances)?.reward_name ?? 'a reward'
                  return (
                    <Link key={it.id} href="/collections" onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.03] transition-colors">
                      <div className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center font-bold text-[#1D1D1F] text-sm shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#1D1D1F] leading-snug">
                          <span className="font-semibold">{name}</span> requested <span className="font-semibold">{reward}</span>
                        </p>
                        <p className="text-black/35 text-xs mt-0.5">{relativeTime(it.requested_at)}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}

            <Link href="/collections" onClick={() => setOpen(false)}
              className="block px-4 py-3 text-center text-sm font-semibold text-rounds hover:bg-black/[0.03] border-t border-black/5 transition-colors">
              Go to Collections
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
