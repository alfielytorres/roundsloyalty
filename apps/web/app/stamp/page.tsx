import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import StampScanner from './StampScanner'
import QRDisplay from '@/app/qr/QRDisplay'
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
    .select('id, rounds_awarded, created_at, profiles(display_name)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(8)

  if (!txns?.length) {
    return (
      <div className="text-center py-8 text-black/30 text-sm">No stamps yet today.</div>
    )
  }

  return (
    <div className="divide-y divide-black/5">
      {txns.map((t) => {
        const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
        const name = (profile as { display_name?: string | null } | null)?.display_name ?? 'Customer'
        const time = new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        return (
          <div key={t.id} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center font-semibold text-[#1D1D1F] text-xs">
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-[#1D1D1F]">{name}</span>
            </div>
            <div className="flex items-center gap-3 text-right">
              <span className="text-sm font-bold text-[#1D1D1F]">+{t.rounds_awarded}</span>
              <span className="text-xs text-black/30 w-12">{time}</span>
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
      <Zap size={18} className="shrink-0" />
      <div>
        <p className="font-black text-sm">{campaign.name} — {campaign.round_value}× rounds active</p>
        <p className="text-white/60 text-xs mt-0.5">Every stamp awards {campaign.round_value} rounds right now</p>
      </div>
    </div>
  )
}

export default async function StampPage() {
  const { vendor } = await getPortalData()

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-7">
          <p className="text-black/30 text-xs font-semibold tracking-widest uppercase mb-0.5">{vendor.business_name}</p>
          <h1 className="text-3xl font-extrabold text-[#1D1D1F]">Stamp</h1>
          <p className="text-black/40 text-sm mt-1">Scan a customer QR to award a round</p>
        </div>

        <Suspense fallback={null}>
          <CampaignBanner vendorId={vendor.id} />
        </Suspense>

        {/* Two-column layout on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* Left: scanner */}
          <div>
            <p className="text-[10px] font-bold text-black/30 tracking-widest uppercase mb-2">Scan Customer</p>
            <StampScanner vendorId={vendor.id} />
          </div>

          {/* Right: store QR + recent activity */}
          <div className="flex flex-col gap-5">
            {/* Store QR */}
            <div>
              <p className="text-[10px] font-bold text-black/30 tracking-widest uppercase mb-2">Your Store QR</p>
              <div className="glass p-5">
                <p className="text-sm text-black/50 mb-4">Show this to customers so they can join your loyalty program.</p>
                <QRDisplay />
              </div>
            </div>

            {/* Recent stamps */}
            <div>
              <p className="text-[10px] font-bold text-black/30 tracking-widest uppercase mb-2">Recent Stamps</p>
              <div className="glass px-5">
                <Suspense fallback={<div className="py-8 text-center text-black/30 text-sm">Loading…</div>}>
                  <RecentActivity vendorId={vendor.id} />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
