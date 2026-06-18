import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import PortalShell from '@/components/PortalShell'
import { Send } from 'lucide-react'

async function PastOffers({ businessId }: { businessId: string }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: offers } = await supabase
    .from('offers')
    .select('id, title, body, target_segment, sent_at')
    .eq('business_id', businessId)
    .order('sent_at', { ascending: false })
    .limit(50)

  const offerIds = offers?.map((o) => o.id) ?? []
  const { data: recipientRows } = offerIds.length
    ? await supabase.from('offer_recipients').select('offer_id').in('offer_id', offerIds)
    : { data: [] }

  const countByOffer: Record<string, number> = {}
  for (const r of recipientRows ?? []) {
    countByOffer[r.offer_id] = (countByOffer[r.offer_id] ?? 0) + 1
  }

  if (!offers?.length) {
    return <div className="glass-row px-6 py-12 text-center text-white/40">No offers sent yet.</div>
  }

  return (
    <div className="flex flex-col gap-3">
      {offers.map((offer) => (
        <div key={offer.id} className="glass-row px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white truncate">{offer.title}</p>
              <p className="text-white/50 text-sm mt-1 line-clamp-2">{offer.body}</p>
            </div>
            <span className="shrink-0 text-xs font-bold text-[#7DB542] bg-[#7DB542]/20 px-3 py-1 rounded-full">
              {countByOffer[offer.id] ?? 0} sent
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${segmentClass(offer.target_segment)}`}>
              {offer.target_segment === 'at_risk' ? 'At risk' : offer.target_segment}
            </span>
            {offer.sent_at && <span className="text-xs text-white/40">{new Date(offer.sent_at).toLocaleDateString()}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function OffersSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass-row px-6 py-4">
          <div className="h-5 w-48 bg-white/10 rounded mb-2" />
          <div className="h-4 w-full bg-white/5 rounded" />
        </div>
      ))}
    </div>
  )
}

const segments = [
  { value: 'all', label: 'All customers' },
  { value: 'top', label: 'Top customers' },
  { value: 'returning', label: 'Returning customers' },
  { value: 'at_risk', label: 'At risk customers' },
]

export default async function OffersPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string }
}) {
  const { business } = await getPortalData()

  return (
    <PortalShell>
      <main className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-white">Send Offer</h1>
            <p className="text-white/50 mt-1">Send a personalised message to your customers</p>
          </div>

          {searchParams.error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-300 text-sm">{searchParams.error}</div>
          )}
          {searchParams.success && (
            <div className="mb-6 p-4 bg-[#7DB542]/20 border border-[#7DB542]/30 rounded-2xl text-[#D4EDBE] text-sm font-semibold">{searchParams.success}</div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card p-8 h-fit">
              <h2 className="text-xl font-bold text-white mb-6">New offer</h2>
              <form action="/api/offers/send" method="POST" className="flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Title</label>
                  <input name="title" required placeholder="e.g. Free coffee this weekend!"
                    className="w-full dark-input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Message</label>
                  <textarea name="body" required rows={4} placeholder="Write your message here..."
                    className="w-full dark-input resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Send to</label>
                  <select name="target_segment"
                    className="w-full dark-input bg-[#0D1F0D]">
                    {segments.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <button type="submit" className="flex items-center justify-center gap-2 w-full bg-[#7DB542] text-white font-bold py-3 rounded-2xl hover:opacity-90 transition-opacity">
                  <Send size={16} />Send offer
                </button>
              </form>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-4">Past offers</h2>
              <Suspense fallback={<OffersSkeleton />}>
                <PastOffers businessId={business.id} />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
    </PortalShell>
  )
}

function segmentClass(seg: string) {
  switch (seg) {
    case 'top': return 'bg-[#7DB542] text-white'
    case 'returning': return 'bg-[#7DB542]/20 text-[#D4EDBE]'
    case 'at_risk': return 'bg-red-500/20 text-red-300'
    default: return 'bg-white/10 text-white/50'
  }
}
