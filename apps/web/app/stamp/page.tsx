import PortalShell from '@/components/PortalShell'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import StampScanner from './StampScanner'

export default async function StampPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string; customer?: string }
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

  // Recent stamps for this business
  const { data: recentStamps } = await supabase
    .from('visit_events')
    .select('id, stamps_added, created_at, loyalty_cards(customer_id, profiles(display_name))')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <PortalShell>
    <main className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-primary-dark">Stamp Card</h1>
          <p className="text-taupe mt-1">Scan or enter a customer&apos;s card code to add stamps</p>
        </div>

        {searchParams.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {searchParams.error}
          </div>
        )}
        {searchParams.success && (
          <div className="mb-6 p-4 bg-primary-light border border-primary rounded-2xl text-primary-dark font-semibold">
            {searchParams.success}
          </div>
        )}

        {/* Scanner — client component handles camera + autofocus input */}
        <StampScanner />

        {/* Recent activity */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-primary-dark mb-3">Recent stamps</h2>
          <div className="flex flex-col gap-2">
            {recentStamps?.length ? recentStamps.map((v) => {
              const card = v.loyalty_cards as { customer_id: string; profiles: { display_name: string } | null } | null
              const name = card?.profiles?.display_name ?? 'Customer'
              return (
                <div key={v.id} className="bg-white rounded-2xl px-5 py-3 flex items-center justify-between shadow-sm">
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
            }) : (
              <div className="bg-white rounded-2xl px-5 py-10 text-center text-taupe shadow-sm">
                No stamps given today.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
    </PortalShell>
  )
}
