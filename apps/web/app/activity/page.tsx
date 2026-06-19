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
  if (type === 'stamp_added') return '#16A34A'
  if (type === 'points_added') return '#2563EB'
  if (type === 'reward_redeemed') return '#D97706'
  if (type === 'transaction_voided') return '#DC2626'
  return '#6B7280'
}

function eventBg(type: string) {
  if (type === 'stamp_added') return '#F0FDF4'
  if (type === 'points_added') return '#EFF6FF'
  if (type === 'reward_redeemed') return '#FFFBEB'
  if (type === 'transaction_voided') return '#FEF2F2'
  return '#F3F4F6'
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
      <div className="bg-white border border-[#E8E2D9] rounded-3xl px-6 py-16 text-center text-[#6B7280] shadow-sm">
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
          <div key={e.id} className="bg-white border border-[#E8E2D9] rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
              <IconComp size={18} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#111111] truncate">{name}</p>
              <p className="text-[#9CA3AF] text-xs mt-0.5">{new Date(e.created_at).toLocaleString()}</p>
            </div>
            <span className="font-bold text-sm whitespace-nowrap" style={{ color }}>
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
        <div key={i} className="bg-white border border-[#E8E2D9] rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-[#C8C0B4] shrink-0" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-[#C8C0B4] rounded mb-2" />
            <div className="h-3 w-24 bg-[#D8D0C8] rounded" />
          </div>
          <div className="h-4 w-16 bg-[#C8C0B4] rounded" />
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
          <p className="text-[#9CA3AF] text-xs font-semibold tracking-widest uppercase mb-1">{vendor.business_name}</p>
          <h1 className="text-3xl font-extrabold text-[#111111]">Activity</h1>
          <p className="text-[#6B7280] mt-1">Full ledger of stamps, points and redemptions</p>
        </div>

        <Suspense fallback={<LedgerSkeleton />}>
          <LedgerFeed vendorId={vendor.id} />
        </Suspense>
      </div>
    </main>
  )
}
