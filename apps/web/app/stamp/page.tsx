import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import PortalShell from '@/components/PortalShell'
import StampScanner from './StampScanner'

async function RecentStamps({ businessId }: { businessId: string }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: recentStamps } = await supabase
    .from('visit_events')
    .select('id, stamps_added, created_at, loyalty_cards(customer_id, profiles(display_name))')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!recentStamps?.length) {
    return <div className="glass-row px-5 py-10 text-center text-taupe">No stamps given today.</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {recentStamps.map((v) => {
        const rawCard = Array.isArray(v.loyalty_cards) ? v.loyalty_cards[0] : v.loyalty_cards
        const card = rawCard as { customer_id: string; profiles: { display_name: string }[] | null } | null
        const name = card?.profiles?.[0]?.display_name ?? 'Customer'
        return (
          <div key={v.id} className="glass-row px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary-light flex items-center justify-center font-bold text-primary-dark text-sm">
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-primary-dark">{name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-primary font-bold">+{v.stamps_added} stamp{v.stamps_added !== 1 ? 's' : ''}</span>
              <span className="text-taupe text-xs">{new Date(v.created_at).toLocaleTimeString()}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RecentStampsSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass-row px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gray-200" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
          <div className="h-4 w-20 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  )
}

export default async function StampPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string }
}) {
  const { business } = await getPortalData()

  return (
    <PortalShell>
      <main className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-primary-dark">Stamp Card</h1>
            <p className="text-taupe mt-1">Scan or enter a customer&apos;s card code to add stamps</p>
          </div>

          {searchParams.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">{searchParams.error}</div>
          )}
          {searchParams.success && (
            <div className="mb-6 p-4 bg-primary-light border border-primary rounded-2xl text-primary-dark font-semibold">{searchParams.success}</div>
          )}

          <StampScanner />

          <div className="mt-10">
            <h2 className="text-lg font-bold text-primary-dark mb-3">Recent stamps</h2>
            <Suspense fallback={<RecentStampsSkeleton />}>
              <RecentStamps businessId={business.id} />
            </Suspense>
          </div>
        </div>
      </main>
    </PortalShell>
  )
}
