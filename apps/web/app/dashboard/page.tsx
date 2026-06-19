import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import { Users, Award, PackageCheck, Megaphone, Clock } from 'lucide-react'

function StatCard({
  value,
  label,
  sublabel,
  gradientClass,
}: {
  value: string | number
  label: string
  sublabel: string
  gradientClass: string
}) {
  return (
    <div className={`${gradientClass} flex flex-col justify-between min-h-[160px]`}>
      <p className="text-xs tracking-widest uppercase text-white/60 font-semibold">{label}</p>
      <div>
        <p className="text-7xl font-black text-white leading-none">{value}</p>
        <p className="text-sm text-white/60 mt-2">{sublabel}</p>
      </div>
    </div>
  )
}

function StatCardSkeleton({ gradientClass }: { gradientClass: string }) {
  return (
    <div className={`${gradientClass} min-h-[160px] animate-pulse flex flex-col justify-between`}>
      <div className="h-2 w-24 bg-white/20 rounded" />
      <div>
        <div className="h-16 w-20 bg-white/20 rounded-xl mb-3" />
        <div className="h-3 w-28 bg-white/10 rounded" />
      </div>
    </div>
  )
}

async function DashboardStats({ vendorId }: { vendorId: string }) {
  const cookieStore = cookies()
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
    supabase
      .from('round_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .gte('created_at', todayISO),
    supabase
      .from('round_transactions')
      .select('customer_id')
      .eq('vendor_id', vendorId)
      .gte('created_at', todayISO),
    supabase
      .from('reward_instances')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .gte('created_at', todayISO),
    supabase
      .from('reward_collections')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .in('status', ['requested', 'ready']),
    supabase
      .from('round_campaigns')
      .select('id, name, round_value, starts_at, ends_at, status')
      .eq('vendor_id', vendorId)
      .eq('status', 'scheduled')
      .order('starts_at', { ascending: true }),
  ])

  const uniqueCount = new Set((uniqueCustomersToday ?? []).map((r: { customer_id: string }) => r.customer_id)).size
  const now = new Date()
  const liveCampaign = campaigns?.find((c) => new Date(c.starts_at) <= now && new Date(c.ends_at) > now) ?? null
  const upcomingCampaign = campaigns?.find((c) => new Date(c.starts_at) > now) ?? null

  function timeRemaining(endsAt: string) {
    const diff = new Date(endsAt).getTime() - now.getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`
    return `${h}h ${m}m`
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard value={roundsToday ?? 0} label="Rounds Today" sublabel="awarded today" gradientClass="card-rose" />
        <StatCard value={uniqueCount} label="Customers" sublabel="visited today" gradientClass="card-teal" />
        <StatCard value={rewardsToday ?? 0} label="Rewards Unlocked" sublabel="redeemed today" gradientClass="card-coral" />
        <StatCard value={activeCollections ?? 0} label="Active Collections" sublabel="pending pickup" gradientClass="card-blue" />
      </div>

      {liveCampaign && (
        <div className="card-gold mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-white/70">Live Campaign</span>
          </div>
          <h2 className="text-2xl font-black text-white mb-1">{liveCampaign.name}</h2>
          <p className="text-3xl font-black text-white mb-3">{liveCampaign.round_value}× ROUNDS</p>
          <div className="flex items-center gap-1.5 text-white/70 text-sm">
            <Clock size={14} />
            <span>{timeRemaining(liveCampaign.ends_at)} remaining</span>
          </div>
        </div>
      )}

      {upcomingCampaign && !liveCampaign && (
        <div className="card-dark mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone size={16} className="text-white/50" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/50">Upcoming Campaign</span>
          </div>
          <p className="font-bold text-white text-lg">{upcomingCampaign.name}</p>
          <p className="text-white/50 text-sm mt-0.5">
            Starts {new Date(upcomingCampaign.starts_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
      )}
    </>
  )
}

async function RecentActivity({ vendorId }: { vendorId: string }) {
  const cookieStore = cookies()
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
      <div className="card-dark text-center py-10">
        <p className="text-white/40 font-medium">No activity yet today.</p>
      </div>
    )
  }

  return (
    <div className="card-dark">
      <p className="text-xs tracking-widest uppercase text-white/40 font-semibold mb-4">Recent Activity</p>
      <div className="flex flex-col">
        {txns.map((t) => {
          const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
          const name = (profile as { display_name?: string | null } | null)?.display_name ?? 'Customer'
          return (
            <div key={t.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-sm">
                  {name.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-white">{name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-sm text-[#E8805A]">+{t.rounds_awarded} round{t.rounds_awarded !== 1 ? 's' : ''}</span>
                <span className="text-white/30 text-xs">{new Date(t.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="card-dark animate-pulse">
      <div className="h-2 w-28 bg-white/20 rounded mb-4" />
      <div className="flex flex-col gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/10" />
              <div className="h-4 w-28 bg-white/10 rounded" />
            </div>
            <div className="h-4 w-20 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const { vendor } = await getPortalData()

  return (
    <main className="min-h-screen bg-[#0D0D0D] px-6 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-xs tracking-widest uppercase text-white/30 font-semibold mb-1">ROUNDS VENDOR</p>
          <h1 className="text-3xl font-extrabold text-white">Good morning, {vendor.business_name}</h1>
        </div>

        <Suspense fallback={
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatCardSkeleton gradientClass="card-rose" />
            <StatCardSkeleton gradientClass="card-teal" />
            <StatCardSkeleton gradientClass="card-coral" />
            <StatCardSkeleton gradientClass="card-blue" />
          </div>
        }>
          <DashboardStats vendorId={vendor.id} />
        </Suspense>

        <div className="mb-6">
          <Suspense fallback={<ActivitySkeleton />}>
            <RecentActivity vendorId={vendor.id} />
          </Suspense>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/stamp" className="card-coral flex flex-col gap-2 hover:opacity-90 transition-opacity">
            <Award size={22} className="text-white" />
            <span className="font-bold text-white text-sm">Award Round</span>
          </Link>
          <Link href="/collections" className="card-dark flex flex-col gap-2 hover:opacity-90 transition-opacity">
            <PackageCheck size={22} className="text-white/70" />
            <span className="font-bold text-white text-sm">Collections</span>
          </Link>
          <Link href="/campaigns" className="card-dark flex flex-col gap-2 hover:opacity-90 transition-opacity">
            <Megaphone size={22} className="text-white/70" />
            <span className="font-bold text-white text-sm">Campaigns</span>
          </Link>
          <Link href="/customers" className="card-dark flex flex-col gap-2 hover:opacity-90 transition-opacity">
            <Users size={22} className="text-white/70" />
            <span className="font-bold text-white text-sm">Customers</span>
          </Link>
        </div>
      </div>
    </main>
  )
}
