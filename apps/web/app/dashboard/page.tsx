import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import { Users, Award, PackageCheck, Megaphone, Clock, Zap, Gift, type LucideIcon } from 'lucide-react'

function StatCard({ value, label, sublabel, icon: Icon }: { value: string | number; label: string; sublabel: string; icon: LucideIcon }) {
  return (
    <div className="glass flex flex-col gap-3 hover:bg-white/90 transition-colors">
      <div className="w-9 h-9 rounded-xl bg-black/5 flex items-center justify-center">
        <Icon size={17} className="text-black/45" />
      </div>
      <div>
        <p className="text-4xl font-black text-[#1D1D1F] leading-none tabular-nums">{value}</p>
        <p className="text-[13px] font-semibold text-black/55 mt-2">{label}</p>
        <p className="text-[11px] text-black/30 mt-0.5">{sublabel}</p>
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
        <StatCard value={roundsToday ?? 0} label="Rounds today" sublabel="awarded" icon={Zap} />
        <StatCard value={uniqueCount} label="Customers" sublabel="visited today" icon={Users} />
        <StatCard value={rewardsToday ?? 0} label="Rewards" sublabel="unlocked today" icon={Gift} />
        <StatCard value={activeCollections ?? 0} label="Collections" sublabel="to hand over" icon={PackageCheck} />
      </div>

      {liveCampaign && (
        <div className="rounded-3xl p-5 mb-6 text-white shadow-lg" style={{ background: 'linear-gradient(135deg,#1D1D1F,#3a3a40)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">Live campaign</span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-black truncate">{liveCampaign.name}</h2>
              <div className="flex items-center gap-1.5 text-white/60 text-sm mt-1">
                <Clock size={13} /><span>{timeRemaining(liveCampaign.ends_at)} remaining</span>
              </div>
            </div>
            <span className="text-5xl font-black leading-none shrink-0">{liveCampaign.round_value}×</span>
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
        <p className="text-black/30 font-medium">No activity yet.</p>
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
          <p className="text-xs tracking-widest uppercase text-black/25 font-semibold mb-1">Welcome back 👋</p>
          <h1 className="text-3xl font-extrabold text-[#1D1D1F]">{vendor.business_name}</h1>
        </div>

        <Suspense fallback={
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[0, 1, 2, 3].map(i => <div key={i} className="skel h-[132px]" />)}
          </div>
        }>
          <DashboardStats vendorId={vendor.id} />
        </Suspense>

        <div className="mb-6">
          <Suspense fallback={null}>
            <RecentActivity vendorId={vendor.id} />
          </Suspense>
        </div>

        <p className="text-xs tracking-widest uppercase text-black/30 font-semibold mb-3">Quick actions</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/stamp', icon: Award, label: 'Award round', hint: 'Scan or tap' },
            { href: '/collections', icon: PackageCheck, label: 'Collections', hint: 'Hand over rewards' },
            { href: '/campaigns', icon: Megaphone, label: 'Campaigns', hint: 'Bonus rounds' },
            { href: '/customers', icon: Users, label: 'Customers', hint: 'Your members' },
          ].map(({ href, icon: Icon, label, hint }) => (
            <Link key={href} href={href} className="glass flex items-center gap-3 hover:bg-white/90 hover:-translate-y-0.5 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-black/5 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-black/50" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[#1D1D1F] text-sm leading-tight">{label}</p>
                <p className="text-black/35 text-xs">{hint}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
