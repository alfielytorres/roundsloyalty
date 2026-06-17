import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

async function getStats(businessId: string) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ count: totalCustomers }, { count: weekVisits }] = await Promise.all([
    supabase
      .from('vendor_customer_segments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId),
    supabase
      .from('visit_events')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('created_at', weekAgo),
  ])

  return { totalCustomers: totalCustomers ?? 0, weekVisits: weekVisits ?? 0 }
}

export default async function DashboardPage() {
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
    .select('*')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!business) redirect('/onboarding')

  const stats = await getStats(business.id)

  return (
    <main className="min-h-screen bg-cream p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-primary-dark">{business.name}</h1>
            <p className="text-taupe mt-1">Vendor Dashboard</p>
          </div>
          <Link
            href="/settings"
            className="px-4 py-2 rounded-xl border-2 border-taupe text-taupe text-sm font-semibold hover:border-primary-dark hover:text-primary-dark transition-colors"
          >
            Settings
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard label="Total customers" value={stats.totalCustomers} />
          <StatCard label="Visits this week" value={stats.weekVisits} />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/customers"
            className="block bg-white rounded-3xl p-6 hover:shadow-md transition-shadow border border-transparent hover:border-primary"
          >
            <h2 className="text-xl font-bold text-primary-dark mb-2">Customers →</h2>
            <p className="text-taupe">View and segment your customers, export data</p>
          </Link>
          <Link
            href="/offers"
            className="block bg-primary rounded-3xl p-6 hover:opacity-90 transition-opacity"
          >
            <h2 className="text-xl font-bold text-white mb-2">Send Offer →</h2>
            <p className="text-primary-light">Reach your customers with personalised messages</p>
          </Link>
        </div>
      </div>
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <p className="text-4xl font-black text-primary">{value.toLocaleString()}</p>
      <p className="text-taupe mt-1 font-medium">{label}</p>
    </div>
  )
}
