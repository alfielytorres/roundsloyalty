import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import StampQRTabs from './StampQRTabs'

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
    return <div className="bg-white border border-[#E8E2D9] rounded-2xl px-5 py-10 text-center text-[#6B7280] shadow-sm">No recent activity.</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((e) => {
        const profile = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles
        const name = (profile as { display_name?: string | null } | null)?.display_name ?? 'Customer'
        const label = eventLabel(e.event_type, e.delta)
        const color = e.event_type === 'stamp_added' ? '#16A34A' : e.event_type === 'points_added' ? '#2563EB' : '#D97706'
        return (
          <div key={e.id} className="bg-white border border-[#E8E2D9] rounded-2xl px-5 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F0EDE6] flex items-center justify-center font-bold text-[#374151] text-sm">
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-[#111111]">{name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold text-sm" style={{ color }}>{label}</span>
              <span className="text-[#9CA3AF] text-xs">{new Date(e.created_at).toLocaleTimeString()}</span>
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
        <div key={i} className="bg-white border border-[#E8E2D9] rounded-2xl px-5 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#C8C0B4]" />
            <div className="h-4 w-28 bg-[#C8C0B4] rounded" />
          </div>
          <div className="h-4 w-20 bg-[#D8D0C8] rounded" />
        </div>
      ))}
    </div>
  )
}

export default async function StampPage({ searchParams }: { searchParams: { error?: string; success?: string } }) {
  const { vendor } = await getPortalData()

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-lg mx-auto">
        <div className="mb-7">
          <p className="text-[#9CA3AF] text-xs font-semibold tracking-widest uppercase mb-0.5">{vendor.business_name}</p>
          <h1 className="text-3xl font-extrabold text-[#111111]">QR & Scan</h1>
          <p className="text-[#6B7280] mt-1">Show your QR code or scan a customer</p>
        </div>

        {searchParams.error && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">{searchParams.error}</div>
        )}
        {searchParams.success && (
          <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 font-semibold">{searchParams.success}</div>
        )}

        <StampQRTabs />

        <div className="mt-7">
          <h2 className="text-base font-bold text-[#111111] mb-3">Recent activity</h2>
          <Suspense fallback={<RecentActivitySkeleton />}>
            <RecentActivity vendorId={vendor.id} />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
