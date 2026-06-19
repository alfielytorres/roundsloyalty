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

const statusConfig = {
  live: {
    cardClass: 'bg-gradient-to-br from-[#D4A017] to-[#8B6010] rounded-3xl p-5 text-white',
    badge: 'bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full',
    label: 'Live',
  },
  scheduled: {
    cardClass: 'bg-gradient-to-br from-[#4A6FA5] to-[#1A2A50] rounded-3xl p-5 text-white',
    badge: 'bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full',
    label: 'Scheduled',
  },
  ended: {
    cardClass: 'bg-[#1A1A1A] rounded-3xl p-5 text-white',
    badge: 'bg-white/10 text-white/50 text-xs font-bold px-2.5 py-1 rounded-full',
    label: 'Ended',
  },
  cancelled: {
    cardClass: 'bg-gradient-to-br from-[#5A1A1A] to-[#1A0A0A] rounded-3xl p-5 text-white',
    badge: 'bg-white/10 text-white/50 text-xs font-bold px-2.5 py-1 rounded-full',
    label: 'Cancelled',
  },
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
      <div className="card-dark px-6 py-12 text-center">
        <Megaphone className="mx-auto text-white/20 mb-3" size={36} />
        <p className="text-white/50 font-medium">No campaigns yet</p>
        <p className="text-white/30 text-sm mt-1">Create your first campaign to boost engagement</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {(campaigns as Campaign[]).map((c) => {
        const st = campaignStatus(c)
        const cfg = statusConfig[st]
        return (
          <div key={c.id} className={cfg.cardClass}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className={cfg.badge}>{cfg.label}</span>
                <h3 className="font-bold text-white text-lg mt-2">{c.name}</h3>
                <p className="text-white/50 text-sm mt-0.5">
                  {new Date(c.starts_at).toLocaleDateString()} — {new Date(c.ends_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-6xl font-black text-white leading-none">{c.round_value}×</p>
                <p className="text-white/60 text-xs tracking-widest uppercase mt-1">rounds</p>
              </div>
            </div>
            {c.customer_message && (
              <p className="text-white/60 text-sm italic mb-3">&ldquo;{c.customer_message}&rdquo;</p>
            )}
            {st === 'live' && (
              <form action="/api/campaigns/cancel" method="POST">
                <input type="hidden" name="campaign_id" value={c.id} />
                <button type="submit" className="text-xs font-semibold rounded-xl px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20">
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
    <main className="min-h-screen bg-[#0D0D0D] px-6 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-xs tracking-widest uppercase text-white/30 font-semibold mb-1">ROUNDS VENDOR</p>
          <h1 className="text-3xl font-extrabold text-white">Campaigns</h1>
          <p className="text-white/40 mt-1">Run bonus round events to reward loyal customers</p>
        </div>

        {searchParams?.error && (
          <div className="mb-5 p-4 bg-red-900/30 border border-red-500/30 rounded-2xl text-red-400 text-sm">{searchParams.error}</div>
        )}
        {searchParams?.success && (
          <div className="mb-5 p-4 bg-green-900/30 border border-green-500/30 rounded-2xl text-green-400 text-sm font-semibold">{searchParams.success}</div>
        )}

        {/* Create campaign form */}
        <div className="card-dark mb-6">
          <h2 className="text-base font-bold text-white mb-5">Create campaign</h2>
          <form action="/api/campaigns/create" method="POST" className="flex flex-col gap-4">
            <input type="hidden" name="vendor_id" value={vendor.id} />

            <div>
              <label className="block text-sm font-semibold text-white/60 mb-1.5">Campaign name</label>
              <input name="name" required placeholder="e.g. Double Round Weekend" className="w-full dark-input" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/60 mb-1.5">Round value (per scan)</label>
              <input type="number" name="round_value" min="2" max="10" required defaultValue={2} className="w-full dark-input" />
              <p className="text-white/30 text-xs mt-1">Must be between 2 and your program&apos;s max round value</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white/60 mb-1.5">Start date &amp; time</label>
                <input type="datetime-local" name="starts_at" required className="w-full dark-input" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/60 mb-1.5">End date &amp; time</label>
                <input type="datetime-local" name="ends_at" required className="w-full dark-input" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/60 mb-1.5">Customer message (optional)</label>
              <textarea name="customer_message" rows={2} placeholder="Message shown to customers during the campaign" className="w-full dark-input resize-none" />
            </div>

            <button type="submit" className="btn-primary self-start">Create campaign</button>
          </form>
        </div>

        <h2 className="text-base font-bold text-white mb-4">All campaigns</h2>
        <Suspense fallback={
          <div className="flex flex-col gap-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card-dark h-28" />
            ))}
          </div>
        }>
          <CampaignList vendorId={vendor.id} />
        </Suspense>
      </div>
    </main>
  )
}
