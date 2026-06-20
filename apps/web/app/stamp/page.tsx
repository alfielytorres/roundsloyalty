import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import StampScanner from './StampScanner'
import { Zap } from 'lucide-react'

async function RecentActivity({ vendorId }: { vendorId: string }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: txns } = await supabase
    .from('round_transactions')
    .select('id, rounds_awarded, created_at, source, profiles(display_name)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!txns?.length) {
    return <div className="glass px-5 py-10 text-center text-black/40">No recent activity.</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {txns.map((t) => {
        const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
        const name = (profile as { display_name?: string | null } | null)?.display_name ?? 'Customer'
        return (
          <div key={t.id} className="glass px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center font-bold text-[#1D1D1F] text-sm">
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-[#1D1D1F]">{name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold text-sm text-black/70">+{t.rounds_awarded} round{t.rounds_awarded !== 1 ? 's' : ''}</span>
              <span className="text-black/35 text-xs">{new Date(t.created_at).toLocaleTimeString()}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

async function CampaignBanner({ vendorId }: { vendorId: string }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const now = new Date().toISOString()
  const { data: campaign } = await supabase
    .from('round_campaigns')
    .select('name, round_value, ends_at')
    .eq('vendor_id', vendorId)
    .eq('status', 'scheduled')
    .lte('starts_at', now)
    .gt('ends_at', now)
    .limit(1)
    .maybeSingle()

  if (!campaign) return null

  return (
    <div className="mb-5 p-4 bg-[#1D1D1F] rounded-2xl text-white flex items-center gap-3">
      <Zap size={20} className="text-white shrink-0" />
      <div>
        <p className="font-black text-sm uppercase tracking-wide">Campaign Live: {campaign.name}</p>
        <p className="text-white/90 text-sm">This scan awards {campaign.round_value} rounds!</p>
      </div>
    </div>
  )
}

export default async function StampPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { vendor } = await getPortalData()
  const query = await searchParams

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-lg mx-auto">
        <div className="mb-7">
          <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-0.5">{vendor.business_name}</p>
          <h1 className="text-3xl font-extrabold text-[#1D1D1F]">Award Round</h1>
          <p className="text-black/40 mt-1">Scan customer QR to award rounds</p>
        </div>

        {query.error && (
          <div className="mb-5 p-4 bg-black/5 border border-black/10 rounded-2xl text-black/60 text-sm">{query.error}</div>
        )}
        {query.success && (
          <div className="mb-5 p-4 bg-black/5 border border-black/15 rounded-2xl text-black/70 font-semibold">{query.success}</div>
        )}

        <Suspense fallback={null}>
          <CampaignBanner vendorId={vendor.id} />
        </Suspense>

        <StampScanner vendorId={vendor.id} />

        <div className="mt-7">
          <h2 className="text-base font-bold text-[#1D1D1F] mb-3">Recent activity</h2>
          <Suspense fallback={null}>
            <RecentActivity vendorId={vendor.id} />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
