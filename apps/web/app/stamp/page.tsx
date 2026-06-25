import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import StampScanner from './StampScanner'
import QRDisplay from '@/app/qr/QRDisplay'
import { Zap, QrCode, History } from 'lucide-react'

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
    .limit(6)

  if (!txns?.length) {
    return (
      <div className="text-center py-10 text-black/25 text-sm">No stamps yet</div>
    )
  }

  return (
    <div className="divide-y divide-black/[0.04]">
      {txns.map((t) => {
        const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
        const name = (profile as { display_name?: string | null } | null)?.display_name ?? 'Customer'
        const time = new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        return (
          <div key={t.id} className="flex items-center gap-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-black/[0.06] flex items-center justify-center font-semibold text-[#1D1D1F] text-xs shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-[#1D1D1F] truncate flex-1">{name}</span>
            <span className="text-xs font-bold text-[#1D1D1F]">+{t.rounds_awarded}</span>
            <span className="text-[11px] text-black/25 tabular-nums">{time}</span>
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
    <div className="mb-6 p-4 bg-[#1D1D1F] rounded-2xl text-white flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
        <Zap size={16} className="fill-white" />
      </div>
      <div className="min-w-0">
        <p className="font-bold text-sm truncate">{campaign.name}</p>
        <p className="text-white/60 text-xs mt-0.5">Every stamp awards {campaign.round_value}× rounds right now</p>
      </div>
    </div>
  )
}

function SectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-2.5">
      <Icon size={13} className="text-black/30" strokeWidth={2} />
      <p className="text-[11px] font-bold text-black/40 tracking-wide uppercase">{children}</p>
    </div>
  )
}

export default async function StampPage() {
  const { vendor, supabase } = await getPortalData()
  const { data: locations } = await supabase
    .from('vendor_locations')
    .select('id, name')
    .eq('vendor_id', vendor.id)
    .order('created_at')

  return (
    <main className="px-5 sm:px-8 pt-8 sm:pt-12 pb-32">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <p className="text-black/30 text-[11px] font-bold tracking-widest uppercase mb-1">{vendor.business_name}</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1D1D1F] tracking-tight">Stamp</h1>
        </div>

        <Suspense fallback={null}>
          <CampaignBanner vendorId={vendor.id} />
        </Suspense>

        {/* Responsive layout: scanner gets priority, sidebar collapses below */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Scanner — wider column */}
          <div className="lg:col-span-3">
            <SectionLabel icon={QrCode}>Scan customer</SectionLabel>
            <StampScanner vendorId={vendor.id} locations={(locations ?? []) as { id: string; name: string }[]} />
          </div>

          {/* Sidebar — store QR + recent */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div>
              <SectionLabel icon={QrCode}>Your store QR</SectionLabel>
              <div className="glass flex flex-col items-center text-center p-5">
                <div className="w-full max-w-[200px] mx-auto">
                  <QRDisplay />
                </div>
                <p className="text-xs text-black/40 mt-4 leading-relaxed">
                  Customers scan this to join your loyalty program
                </p>
              </div>
            </div>

            <div>
              <SectionLabel icon={History}>Recent stamps</SectionLabel>
              <div className="glass px-4 py-1">
                <Suspense fallback={<div className="py-10 text-center text-black/25 text-sm">Loading…</div>}>
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
