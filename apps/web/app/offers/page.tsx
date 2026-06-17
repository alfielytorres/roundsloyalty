import Link from 'next/link'
import PortalShell from '@/components/PortalShell'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function OffersPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string }
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) redirect('/')

  const cookieStore = cookies()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: { getAll: () => cookieStore.getAll() },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!business) redirect('/dashboard')

  const { data: offers } = await supabase
    .from('offers')
    .select('id, title, body, target_segment, sent_at')
    .eq('business_id', business.id)
    .order('sent_at', { ascending: false })
    .limit(50)

  // Get recipient counts for each offer
  const offerIds = offers?.map((o) => o.id) ?? []
  const { data: recipientCounts } = offerIds.length
    ? await supabase
        .from('offer_recipients')
        .select('offer_id')
        .in('offer_id', offerIds)
    : { data: [] }

  const countByOffer: Record<string, number> = {}
  for (const r of recipientCounts ?? []) {
    countByOffer[r.offer_id] = (countByOffer[r.offer_id] ?? 0) + 1
  }

  const segments = [
    { value: 'all', label: 'All customers' },
    { value: 'top', label: 'Top customers' },
    { value: 'returning', label: 'Returning customers' },
    { value: 'at_risk', label: 'At risk customers' },
  ]

  return (
    <PortalShell>
    <main className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-primary-dark">Send Offer</h1>
          <p className="text-taupe mt-1">Send a personalised message to your customers</p>
        </div>

        {searchParams.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {searchParams.error}
          </div>
        )}
        {searchParams.success && (
          <div className="mb-6 p-4 bg-primary-light border border-primary rounded-2xl text-primary-dark text-sm font-semibold">
            {searchParams.success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Compose */}
          <div className="bg-white rounded-3xl p-8 shadow-sm h-fit">
            <h2 className="text-xl font-bold text-primary-dark mb-6">New offer</h2>
            <form action="/api/offers/send" method="POST" className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-primary-dark mb-2">Title</label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Free coffee this weekend!"
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-primary-dark focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary-dark mb-2">Message</label>
                <textarea
                  name="body"
                  required
                  rows={4}
                  placeholder="Write your message here..."
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-primary-dark focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary-dark mb-2">Send to</label>
                <select
                  name="target_segment"
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-primary-dark focus:outline-none focus:border-primary transition-colors bg-white"
                >
                  {segments.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-white font-bold py-3 rounded-2xl hover:opacity-90 transition-opacity"
              >
                Send offer
              </button>
            </form>
          </div>

          {/* Past offers */}
          <div>
            <h2 className="text-xl font-bold text-primary-dark mb-4">Past offers</h2>
            <div className="flex flex-col gap-3">
              {offers?.length ? offers.map((offer) => (
                <div key={offer.id} className="bg-white rounded-2xl px-6 py-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-primary-dark truncate">{offer.title}</p>
                      <p className="text-taupe text-sm mt-1 line-clamp-2">{offer.body}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full">
                      {countByOffer[offer.id] ?? 0} sent
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${segmentClass(offer.target_segment)}`}>
                      {offer.target_segment === 'at_risk' ? 'At risk' : offer.target_segment}
                    </span>
                    {offer.sent_at && (
                      <span className="text-xs text-taupe">
                        {new Date(offer.sent_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              )) : (
                <div className="bg-white rounded-2xl px-6 py-12 text-center text-taupe shadow-sm">
                  No offers sent yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
    </PortalShell>
  )
}

function segmentClass(seg: string) {
  switch (seg) {
    case 'top': return 'bg-primary text-white'
    case 'returning': return 'bg-primary-light text-primary-dark'
    case 'at_risk': return 'bg-red-100 text-red-700'
    default: return 'bg-cream text-taupe'
  }
}
