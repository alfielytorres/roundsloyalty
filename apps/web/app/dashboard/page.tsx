import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import { Users, Award, PackageCheck, Megaphone, Clock } from 'lucide-react'

function StatCard({ value, label, sublabel }: { value: string | number; label: string; sublabel: string }) {
  return (
    <div className="glass flex flex-col justify-between min-h-[150px]">
      <p className="text-xs tracking-widest uppercase text-black/30 font-semibold">{label}</p>
      <div>
        <p className="text-7xl font-black text-[#1D1D1F] leading-none">{value}</p>
        <p className="text-sm text-black/40 mt-2">{sublabel}</p>
      </div>
    </div>
  )
}


async function DashboardStats({ vendorId }: { vendorId: string }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayISO = todayStart.toISOString()

  const [
    { count: roundsToday },
    { data: uniqueCustomersToday },
    { count: rewardsToday },
    { count: activeCollections },
    { data: campaigns },
  ] = await Promise.all([
    supabase.from('round_transactions').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorId).gte('created_at', todayISO),
    supabase.from('round_transactions').select('customer_id').eq('vendor_id', vendorId).gte('created_at', todayISO),
    supabase.from('reward_instances').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorId).gte('created_at', todayISO),
    supabase.from('reward_collections').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorId).in('status', ['requested', 'ready']),
    supabase.from('round_campaigns').select('id, name, round_value, starts_at, ends_at, status').eq('vendor_id', vendorId).eq('status', 'scheduled').order('starts_at', { ascending: true }),
  ])

  const uniqueCount = new Set((uniqueCustomersToday ?? []).map((r: { customer_id: string }) => r.customer_id)).size
  const now = new Date()
  const liveCampaign = campaigns?.find((c) => new Date(c.starts_at) <= now && new Date(c.ends_at) > now) ?? null
  const upcomingCampaign = campaigns?.find((c) => new Date(c.starts_at) > now) ?? null

  function timeRemaining(endsAt: string) {
    const diff = new Date(endsAt).getTime() - now.getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return h > 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard value={roundsToday ?? 0} label="Rounds Today" sublabel="awarded today" />
        <StatCard value={uniqueCount} label="Customers" sublabel="visited today" />
        <StatCard value={rewardsToday ?? 0} label="Rewards" sublabel="unlocked today" />
        <StatCard value={activeCollections ?? 0} label="Collections" sublabel="pending pickup" />
      </div>

      {liveCampaign && (
        <div className="glass mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-black/40">Live Campaign</span>
          </div>
          <h2 className="text-2xl font-black text-[#1D1D1F] mb-1">{liveCampaign.name}</h2>
          <p className="text-4xl font-black text-[#1D1D1F] mb-3">{liveCampaign.round_value}×</p>
          <div className="flex items-center gap-1.5 text-black/40 text-sm">
            <Clock size={13} />
            <span>{timeRemaining(liveCampaign.ends_at)} remaining</span>
          </div>
        </div>
      )}

      {upcomingCampaign && !liveCampaign && (
        <div className="glass mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone size={15} className="text-black/30" />
            <span className="text-xs font-bold uppercase tracking-widest text-black/30">Upcoming Campaign</span>
          </div>
          <p className="font-bold text-[#1D1D1F] text-lg">{upcomingCampaign.name}</p>
          <p className="text-black/40 text-sm mt-0.5">
            Starts {new Date(upcomingCampaign.starts_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
      )}
    </>
  )
}

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
    return (
      <div className="glass text-center py-10">
        <p className="text-black/30 font-medium">No activity yet today.</p>
      </div>
    )
  }

  return (
    <div className="glass">
      <p className="text-xs tracking-widest uppercase text-black/30 font-semibold mb-4">Recent Activity</p>
      <div className="flex flex-col">
        {txns.map((t) => {
          const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
          const name = (profile as { display_name?: string | null } | null)?.display_name ?? 'Customer'
          return (
            <div key={t.id} className="flex items-center justify-between py-3 border-b border-black/5 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center font-bold text-[#1D1D1F] text-sm">
                  {name.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-[#1D1D1F]">{name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-sm text-[#1D1D1F]">+{t.rounds_awarded}</span>
                <span className="text-black/25 text-xs">{new Date(t.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


export default async function DashboardPage() {
  const { vendor } = await getPortalData()

  return (
    <main className="min-h-screen px-6 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-xs tracking-widest uppercase text-black/25 font-semibold mb-1">Round Rewards</p>
          <h1 className="text-3xl font-extrabold text-[#1D1D1F]">{vendor.business_name}</h1>
        </div>

        <Suspense fallback={
          <div className="grid grid-cols-2 gap-3 mb-6">
            
          </div>
        }>
          <DashboardStats vendorId={vendor.id} />
        </Suspense>

        <div className="mb-6">
          <Suspense fallback={null}>
            <RecentActivity vendorId={vendor.id} />
          </Suspense>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/stamp', icon: Award, label: 'Award Round' },
            { href: '/collections', icon: PackageCheck, label: 'Collections' },
            { href: '/campaigns', icon: Megaphone, label: 'Campaigns' },
            { href: '/customers', icon: Users, label: 'Customers' },
          ].map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} className="glass flex flex-col gap-2 hover:bg-white/90 transition-colors">
              <Icon size={20} className="text-black/40" />
              <span className="font-semibold text-[#1D1D1F] text-sm">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
