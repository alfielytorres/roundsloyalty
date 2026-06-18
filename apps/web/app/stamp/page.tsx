import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import StampScanner from './StampScanner'

async function RecentActivity({ vendorId }: { vendorId: string }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: entries } = await supabase
    .from('loyalty_ledger')
    .select('id, event_type, delta, created_at, profiles(display_name)')
    .eq('vendor_id', vendorId)
    .in('event_type', ['stamp_added', 'points_added', 'reward_redeemed'])
    .order('created_at', { ascending: false })
    .limit(10)

  if (!entries?.length) {
    return <div className="glass-row px-5 py-10 text-center text-white/40">No recent activity.</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((e) => {
        const profile = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles
        const name = (profile as { display_name?: string | null } | null)?.display_name ?? 'Customer'
        const label = eventLabel(e.event_type, e.delta)
        return (
          <div key={e.id} className="glass-row px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center font-bold text-[#8B5CF6] text-sm">
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-white">{name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[#8B5CF6] font-bold text-sm">{label}</span>
              <span className="text-white/40 text-xs">{new Date(e.created_at).toLocaleTimeString()}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function eventLabel(type: string, delta: number) {
  switch (type) {
    case 'stamp_added': return `+${delta} stamp${delta !== 1 ? 's' : ''}`
    case 'points_added': return `+${delta} pts`
    case 'reward_redeemed': return 'Reward redeemed'
    default: return type
  }
}

function RecentActivitySkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass-row px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10" />
            <div className="h-4 w-24 bg-white/10 rounded" />
          </div>
          <div className="h-4 w-20 bg-white/5 rounded" />
        </div>
      ))}
    </div>
  )
}

export default async function StampPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string }
}) {
  const { vendor } = await getPortalData()

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-1">{vendor.business_name}</p>
          <h1 className="text-3xl font-extrabold text-white">Scan Card</h1>
          <p className="text-white/50 mt-1">Scan or enter a customer's membership token</p>
        </div>

        {searchParams.error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-300 text-sm">{searchParams.error}</div>
        )}
        {searchParams.success && (
          <div className="mb-6 p-4 bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 rounded-2xl text-white font-semibold">{searchParams.success}</div>
        )}

        <StampScanner />

        <div className="mt-8">
          <h2 className="text-base font-bold text-white mb-3">Recent activity</h2>
          <Suspense fallback={<RecentActivitySkeleton />}>
            <RecentActivity vendorId={vendor.id} />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
