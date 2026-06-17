import Link from 'next/link'
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
    .select('*, offer_recipients(count)')
    .eq('business_id', business.id)
    .order('sent_at', { ascending: false })
    .limit(50)

  const segments = ['all', 'top', 'returning', 'at_risk']

  return (
    <main className="min-h-screen bg-cream p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-taupe text-sm mb-2 block hover:text-primary">← Dashboard</Link>
          <h1 className="text-3xl font-extrabold text-primary-dark">Send Offer</h1>
          <p className="text-taupe mt-1">Send a personalised message to a segment of your customers</p>
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

        {/* Compose form */}
        <div className="bg-white rounded-3xl p-8 shadow-sm mb-10">
          <h2 className="text-xl font-bold text-primary-dark mb-6">New offer</h2>
          <form action="/api/offers/send" method="POST" className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-primary-dark mb-2">Title</label>
              <input
                name="title"
                required
                placeholder="e.g. Free coffee this weekend!"
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-primary-dark focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary-dark mb-2">Message</label>
              <textarea
                name="body"
                required
                rows={3}
                placeholder="Write your message here..."
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-primary-dark focus:outline-none focus:border-primary resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary-dark mb-2">Send to</label>
              <select
                name="target_segment"
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-primary-dark focus:outline-none focus:border-primary bg-white"
              >
                {segments.map((seg) => (
                  <option key={seg} value={seg}>
                    {seg === 'all' ? 'All customers' : seg === 'at_risk' ? 'At risk customers' : seg.charAt(0).toUpperCase() + seg.slice(1) + ' customers'}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="self-start bg-primary text-white font-bold px-8 py-3 rounded-2xl hover:opacity-90 transition-opacity"
            >
              Send offer
            </button>
          </form>
        </div>

        {/* Past offers */}
        <h2 className="text-xl font-bold text-primary-dark mb-4">Past offers</h2>
        <div className="flex flex-col gap-3">
          {offers?.length ? offers.map((offer) => (
            <div key={offer.id} className="bg-white rounded-2xl px-6 py-4 shadow-sm flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-primary-dark">{offer.title}</p>
                <p className="text-taupe text-sm mt-1">{offer.body}</p>
                <p className="text-xs text-taupe mt-2">
                  Segment: <span className="capitalize font-medium">{offer.target_segment}</span>
                  {offer.sent_at && ` · ${new Date(offer.sent_at).toLocaleDateString()}`}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-primary bg-primary-light px-3 py-1 rounded-full">
                {(offer.offer_recipients?.[0] as { count: number } | undefined)?.count ?? 0} sent
              </span>
            </div>
          )) : (
            <div className="bg-white rounded-2xl px-6 py-12 text-center text-taupe shadow-sm">
              No offers sent yet.
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
