import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import { Activity, Stamp, Coins, Gift, RotateCcw } from 'lucide-react'

const EVENT_ICONS: Record<string, React.ElementType> = {
  stamp_added: Stamp,
  points_added: Coins,
  reward_redeemed: Gift,
  transaction_voided: RotateCcw,
}

const EVENT_LABELS: Record<string, (delta: number) => string> = {
  stamp_added: (d) => `+${d} stamp${d !== 1 ? 's' : ''}`,
  points_added: (d) => `+${d} pts`,
  reward_redeemed: () => 'Reward redeemed',
  transaction_voided: () => 'Transaction voided',
  joined: () => 'Joined',
  activated: () => 'Activated',
  new_customer_reward: () => 'New customer reward',
}

async function LedgerFeed({ vendorId }: { vendorId: string }) {
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
    .order('created_at', { ascending: false })
    .limit(50)

  if (!entries?.length) {
    return (
      <div className="glass-row px-5 py-16 text-center text-white/40">
        No activity yet. Start scanning customer cards!
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((e) => {
        const profile = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles
        const name = (profile as { display_name?: string | null } | null)?.display_name ?? 'Customer'
        const IconComp = EVENT_ICONS[e.event_type] ?? Activity
        const labelFn = EVENT_LABELS[e.event_type]
        const label = labelFn ? labelFn(e.delta ?? 0) : e.event_type.replace(/_/g, ' ')
        const isPositive = e.event_type === 'stamp_added' || e.event_type === 'points_added' || e.event_type === 'new_customer_reward'
        const isNegative = e.event_type === 'transaction_voided'

        return (
          <div key={e.id} className="glass-row px-5 py-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isNegative ? 'bg-red-500/20' : 'bg-[#8B5CF6]/20'
            }`}>
              <IconComp size={18} className={isNegative ? 'text-red-400' : 'text-[#8B5CF6]'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{name}</p>
              <p className="text-white/40 text-xs mt-0.5">{new Date(e.created_at).toLocaleString()}</p>
            </div>
            <span className={`font-bold text-sm whitespace-nowrap ${
              isPositive ? 'text-[#8B5CF6]' : isNegative ? 'text-red-400' : 'text-white/50'
            }`}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function LedgerSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="glass-row px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
          <div className="flex-1">
            <div className="h-4 w-28 bg-white/10 rounded mb-2" />
            <div className="h-3 w-20 bg-white/5 rounded" />
          </div>
          <div className="h-4 w-16 bg-white/10 rounded" />
        </div>
      ))}
    </div>
  )
}

export default async function ActivityPage() {
  const { vendor } = await getPortalData()

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-1">{vendor.business_name}</p>
          <h1 className="text-3xl font-extrabold text-white">Activity</h1>
          <p className="text-white/50 mt-1">Full ledger of stamps, points and redemptions</p>
        </div>

        <Suspense fallback={<LedgerSkeleton />}>
          <LedgerFeed vendorId={vendor.id} />
        </Suspense>
      </div>
    </main>
  )
}
