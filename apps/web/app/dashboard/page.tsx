import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import { Users, Award, Zap, PackageCheck, Megaphone, Clock } from 'lucide-react'

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="bg-white border border-[#E8E2D9] rounded-3xl p-5 shadow-sm">
      <p className="text-3xl font-black" style={{ color }}>{value}</p>
      <p className="text-[#6B7280] mt-1 text-sm font-medium">{label}</p>
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="bg-white border border-[#E8E2D9] rounded-3xl p-5 shadow-sm animate-pulse">
      <div className="h-9 w-16 bg-[#C8C0B4] rounded-xl mb-3" />
      <div className="h-3 w-28 bg-[#D8D0C8] rounded-lg" />
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
      .select('id, name, starts_at, ends_at, status')
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
        <StatCard value={roundsToday ?? 0} label="Rounds today" color="#E8805A" />
        <StatCard value={uniqueCount} label="Customers today" color="#2563EB" />
        <StatCard value={rewardsToday ?? 0} label="Rewards unlocked today" color="#8B5CF6" />
        <StatCard value={activeCollections ?? 0} label="Active collections" color="#16A34A" />
      </div>

      {liveCampaign && (
        <div className="bg-[#E8805A] rounded-3xl p-5 mb-6 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={18} className="text-white" />
            <span className="text-sm font-bold uppercase tracking-wide">Campaign Live</span>
          </div>
          <h2 className="text-xl font-black mb-1">{liveCampaign.name}</h2>
          <div className="flex items-center gap-1 text-white/80 text-sm">
            <Clock size={14} />
            <span>{timeRemaining(liveCampaign.ends_at)} remaining</span>
          </div>
        </div>
      )}

      {upcomingCampaign && !liveCampaign && (
        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone size={16} className="text-[#E8805A]" />
            <span className="text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">Upcoming Campaign</span>
          </div>
          <p className="font-bold text-[#111111]">{upcomingCampaign.name}</p>
          <p className="text-[#6B7280] text-sm mt-0.5">
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
      <div className="bg-white border border-[#E8E2D9] rounded-2xl px-5 py-10 text-center text-[#6B7280] shadow-sm">
        No activity yet today.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {txns.map((t) => {
        const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
        const name = (profile as { display_name?: string | null } | null)?.display_name ?? 'Customer'
        return (
          <div key={t.id} className="bg-white border border-[#E8E2D9] rounded-2xl px-5 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F0EDE6] flex items-center justify-center font-bold text-[#374151] text-sm">
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-[#111111]">{name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold text-sm text-[#E8805A]">+{t.rounds_awarded} round{t.rounds_awarded !== 1 ? 's' : ''}</span>
              <span className="text-[#9CA3AF] text-xs">{new Date(t.created_at).toLocaleTimeString()}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ActivitySkeleton() {
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

export default async function DashboardPage() {
  const { vendor } = await getPortalData()

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-[#9CA3AF] text-xs font-semibold tracking-widest uppercase mb-1">{vendor.business_name}</p>
          <h1 className="text-3xl font-extrabold text-[#111111]">Dashboard</h1>
        </div>

        <Suspense fallback={
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
        }>
          <DashboardStats vendorId={vendor.id} />
        </Suspense>

        <h2 className="text-base font-bold text-[#111111] mb-3">Recent activity</h2>
        <Suspense fallback={<ActivitySkeleton />}>
          <RecentActivity vendorId={vendor.id} />
        </Suspense>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <Link href="/stamp" className="flex flex-col gap-2 bg-[#E8805A] rounded-3xl p-5 hover:bg-[#d4714e] transition-colors">
            <Award size={22} className="text-white" />
            <span className="font-bold text-white text-sm">Award Round</span>
          </Link>
          <Link href="/collections" className="flex flex-col gap-2 bg-white border border-[#E8E2D9] rounded-3xl p-5 hover:bg-[#F8F5F1] transition-colors shadow-sm">
            <PackageCheck size={22} className="text-[#16A34A]" />
            <span className="font-bold text-[#111111] text-sm">Collections</span>
          </Link>
          <Link href="/campaigns" className="flex flex-col gap-2 bg-white border border-[#E8E2D9] rounded-3xl p-5 hover:bg-[#F8F5F1] transition-colors shadow-sm">
            <Megaphone size={22} className="text-[#E8805A]" />
            <span className="font-bold text-[#111111] text-sm">Campaigns</span>
          </Link>
          <Link href="/customers" className="flex flex-col gap-2 bg-white border border-[#E8E2D9] rounded-3xl p-5 hover:bg-[#F8F5F1] transition-colors shadow-sm">
            <Users size={22} className="text-[#D97706]" />
            <span className="font-bold text-[#111111] text-sm">Customers</span>
          </Link>
        </div>
      </div>
    </main>
  )
}
