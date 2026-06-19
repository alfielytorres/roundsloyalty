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

function eventColor(type: string) {
  if (type === 'stamp_added') return ''
  if (type === 'points_added') return ''
  if (type === 'reward_redeemed') return ''
  if (type === 'transaction_voided') return '#DC2626'
  return 'text-black/40'
}

function eventBg(type: string) {
  if (type === 'stamp_added') return '#F0FDF4'
  if (type === 'points_added') return '#EFF6FF'
  if (type === 'reward_redeemed') return '#FFFBEB'
  if (type === 'transaction_voided') return '#FEF2F2'
  return '#F3F4F6'
}

async function LedgerFeed({ vendorId }: { vendorId: string }) {
  const cookieStore = await cookies()
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
      <div className="glass rounded-3xl px-6 py-16 text-center text-black/40 ">
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
        const color = eventColor(e.event_type)
        const bg = eventBg(e.event_type)

        return (
          <div key={e.id} className="glass rounded-2xl px-5 py-4 flex items-center gap-4 ">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
              <IconComp size={18}  />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#1D1D1F] truncate">{name}</p>
              <p className="text-black/35 text-xs mt-0.5">{new Date(e.created_at).toLocaleString()}</p>
            </div>
            <span className="font-bold text-sm whitespace-nowrap" >
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
        <div key={i} className="glass rounded-2xl px-5 py-4 flex items-center gap-4 ">
          <div className="w-10 h-10 rounded-full bg-black/15 shrink-0" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-black/15 rounded mb-2" />
            <div className="h-3 w-24 bg-black/10 rounded" />
          </div>
          <div className="h-4 w-16 bg-black/15 rounded" />
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
          <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-1">{vendor.business_name}</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Activity</h1>
          <p className="text-black/40 mt-1">Full ledger of stamps, points and redemptions</p>
        </div>

        <Suspense fallback={<LedgerSkeleton />}>
          <LedgerFeed vendorId={vendor.id} />
        </Suspense>
      </div>
    </main>
  )
}
