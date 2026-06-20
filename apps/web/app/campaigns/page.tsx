import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import { Megaphone, Clock } from 'lucide-react'

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

const statusBadge = {
  live: 'bg-black/5 text-black/70 border border-black/15',
  scheduled: 'bg-black/5 text-black/60 border border-black/10',
  ended: 'bg-black/5 text-black/30 border border-black/5',
  cancelled: 'bg-black/5 text-black/40 border border-black/10',
}

async function CampaignList({ vendorId }: { vendorId: string }) {
  const cookieStore = await cookies()
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
      <div className="glass px-6 py-12 text-center">
        <Megaphone className="mx-auto text-black/20 mb-3" size={36} />
        <p className="text-black/40 font-medium">No campaigns yet</p>
        <p className="text-black/30 text-sm mt-1">Create your first campaign to boost engagement</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {(campaigns as Campaign[]).map((c) => {
        const st = campaignStatus(c)
        const isLive = st === 'live'
        return (
          <div key={c.id} className={`glass ${!isLive && st !== 'scheduled' ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusBadge[st]}`}>
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </span>
                <h3 className="font-bold text-[#1D1D1F] text-lg mt-2">{c.name}</h3>
                <p className="text-black/40 text-sm mt-0.5">
                  {new Date(c.starts_at).toLocaleDateString()} — {new Date(c.ends_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-4xl font-black text-[#1D1D1F] leading-none">{c.round_value}×</p>
                <p className="text-black/30 text-xs tracking-widest uppercase mt-1">rounds</p>
              </div>
            </div>
            {c.customer_message && (
              <p className="text-black/50 text-sm italic mb-3">&ldquo;{c.customer_message}&rdquo;</p>
            )}
            {isLive && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-black/70 text-xs font-semibold">
                  <Clock size={12} />
                  <span>Ends {new Date(c.ends_at).toLocaleString()}</span>
                </div>
                <form action="/api/campaigns/cancel" method="POST">
                  <input type="hidden" name="campaign_id" value={c.id} />
                  <button type="submit" className="text-xs font-semibold rounded-xl px-3 py-1.5 border border-black/10 text-black/50 hover:border-black/20 hover:text-black/70 transition-colors">
                    End campaign
                  </button>
                </form>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { vendor } = await getPortalData()
  const query = await searchParams

  return (
    <main className="min-h-screen px-6 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-xs tracking-widest uppercase text-black/30 font-semibold mb-1">ROUNDS VENDOR</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Campaigns</h1>
          <p className="text-black/40 text-sm mt-0.5">Run bonus round events to reward loyal customers</p>
        </div>

        {query?.error && (
          <div className="mb-5 p-4 bg-black/5 border border-black/10 rounded-2xl text-black/60 text-sm">{query.error}</div>
        )}
        {query?.success && (
          <div className="mb-5 p-4 bg-black/5 border border-black/15 rounded-2xl text-black/70 text-sm font-semibold">{query.success}</div>
        )}

        <div className="glass mb-6">
          <h2 className="text-base font-bold text-[#1D1D1F] mb-5">Create campaign</h2>
          <form action="/api/campaigns/create" method="POST" className="flex flex-col gap-4">
            <input type="hidden" name="vendor_id" value={vendor.id} />

            <div>
              <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Campaign name</label>
              <input name="name" required placeholder="e.g. Double Round Weekend" className="dark-input" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Round value (per scan)</label>
              <input type="number" name="round_value" min="2" max="10" required defaultValue={2} className="dark-input" />
              <p className="text-black/30 text-xs mt-1">Must be between 2 and your program&apos;s max round value</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Start</label>
                <input type="datetime-local" name="starts_at" required className="dark-input" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">End</label>
                <input type="datetime-local" name="ends_at" required className="dark-input" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Customer message (optional)</label>
              <textarea name="customer_message" rows={2} placeholder="Message shown to customers during the campaign" className="dark-input resize-none" />
            </div>

            <button type="submit" className="w-full sm:w-auto bg-[#1D1D1F] hover:bg-black text-white font-semibold py-3 px-5 rounded-2xl transition-colors text-sm">
              Create campaign
            </button>
          </form>
        </div>

        <h2 className="text-base font-bold text-[#1D1D1F] mb-4">All campaigns</h2>
        <Suspense fallback={null}>
          <CampaignList vendorId={vendor.id} />
        </Suspense>
      </div>
    </main>
  )
}
