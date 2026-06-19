import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import { Megaphone } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  round_value: number
  starts_at: string
  ends_at: string
  status: string
  customer_message: string | null
}

function campaignStatus(c: Campaign): 'live' | 'scheduled' | 'ended' | 'cancelled' {
  if (c.status === 'cancelled') return 'cancelled'
  const now = new Date()
  if (new Date(c.starts_at) <= now && new Date(c.ends_at) > now) return 'live'
  if (new Date(c.starts_at) > now) return 'scheduled'
  return 'ended'
}

function StatusBadge({ status }: { status: string }) {
  const cls = {
    live: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
    ended: 'bg-gray-100 text-gray-500 border-gray-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
  }[status] ?? 'bg-gray-100 text-gray-500 border-gray-200'

  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

async function CampaignList({ vendorId }: { vendorId: string }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: campaigns } = await supabase
    .from('round_campaigns')
    .select('id, name, round_value, starts_at, ends_at, status, customer_message')
    .eq('vendor_id', vendorId)
    .order('starts_at', { ascending: false })
    .limit(50)

  if (!campaigns?.length) {
    return (
      <div className="bg-white border border-[#E8E2D9] rounded-3xl px-6 py-12 text-center shadow-sm">
        <Megaphone className="mx-auto text-[#9CA3AF] mb-3" size={36} />
        <p className="text-[#6B7280] font-medium">No campaigns yet</p>
        <p className="text-[#9CA3AF] text-sm mt-1">Create your first campaign to boost engagement</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {(campaigns as Campaign[]).map((c) => {
        const st = campaignStatus(c)
        return (
          <div key={c.id} className="bg-white border border-[#E8E2D9] rounded-3xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-bold text-[#111111]">{c.name}</h3>
                <p className="text-[#6B7280] text-sm mt-0.5">
                  {new Date(c.starts_at).toLocaleDateString()} — {new Date(c.ends_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={st} />
                <span className="text-xs font-bold bg-[#E8805A]/10 text-[#E8805A] border border-[#E8805A]/20 px-2.5 py-1 rounded-full">
                  ×{c.round_value} rounds
                </span>
              </div>
            </div>
            {c.customer_message && (
              <p className="text-[#6B7280] text-sm italic mb-3">&ldquo;{c.customer_message}&rdquo;</p>
            )}
            {st === 'live' && (
              <form action="/api/campaigns/cancel" method="POST">
                <input type="hidden" name="campaign_id" value={c.id} />
                <button type="submit" className="text-xs font-semibold rounded-xl px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                  End campaign
                </button>
              </form>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default async function CampaignsPage({ searchParams }: { searchParams: { error?: string; success?: string } }) {
  const { vendor } = await getPortalData()

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-[#9CA3AF] text-xs font-semibold tracking-widest uppercase mb-1">{vendor.business_name}</p>
          <h1 className="text-3xl font-extrabold text-[#111111]">Campaigns</h1>
          <p className="text-[#6B7280] mt-1">Run bonus round events to reward loyal customers</p>
        </div>

        {searchParams?.error && <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">{searchParams.error}</div>}
        {searchParams?.success && <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm font-semibold">{searchParams.success}</div>}

        {/* Create campaign form */}
        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-6 shadow-sm mb-6">
          <h2 className="text-base font-bold text-[#111111] mb-5">Create campaign</h2>
          <form action="/api/campaigns/create" method="POST" className="flex flex-col gap-4">
            <input type="hidden" name="vendor_id" value={vendor.id} />

            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">Campaign name</label>
              <input name="name" required placeholder="e.g. Double Round Weekend" className="w-full dark-input" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">Round value (per scan)</label>
              <input type="number" name="round_value" min="2" max="10" required defaultValue={2} className="w-full dark-input" />
              <p className="text-[#9CA3AF] text-xs mt-1">Must be between 2 and your program&apos;s max round value</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#374151] mb-1.5">Start date &amp; time</label>
                <input type="datetime-local" name="starts_at" required className="w-full dark-input" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#374151] mb-1.5">End date &amp; time</label>
                <input type="datetime-local" name="ends_at" required className="w-full dark-input" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">Customer message (optional)</label>
              <textarea name="customer_message" rows={2} placeholder="Message shown to customers during the campaign" className="w-full dark-input resize-none" />
            </div>

            <button type="submit" className="btn-primary self-start">Create campaign</button>
          </form>
        </div>

        <h2 className="text-base font-bold text-[#111111] mb-4">All campaigns</h2>
        <Suspense fallback={
          <div className="flex flex-col gap-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-[#E8E2D9] rounded-3xl p-5 shadow-sm h-24" />
            ))}
          </div>
        }>
          <CampaignList vendorId={vendor.id} />
        </Suspense>
      </div>
    </main>
  )
}
