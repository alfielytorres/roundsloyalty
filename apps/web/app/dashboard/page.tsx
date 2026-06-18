import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import PortalShell from '@/components/PortalShell'
import { Users, TrendingUp, Stamp, Send } from 'lucide-react'

async function Stats({ businessId }: { businessId: string }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [{ count: totalCustomers }, { count: weekVisits }] = await Promise.all([
    supabase.from('vendor_customer_segments').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
    supabase.from('visit_events').select('*', { count: 'exact', head: true }).eq('business_id', businessId).gte('created_at', weekAgo),
  ])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      <StatCard label="Total customers" value={totalCustomers ?? 0} icon={<Users size={16} className="text-taupe" />} />
      <StatCard label="Visits this week" value={weekVisits ?? 0} icon={<TrendingUp size={16} className="text-taupe" />} />
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="glass-card p-6 animate-pulse">
          <div className="h-10 w-20 bg-gray-200 rounded-xl mb-2" />
          <div className="h-4 w-32 bg-gray-100 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export default async function DashboardPage() {
  const { business } = await getPortalData()

  return (
    <PortalShell>
      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-primary-dark">Dashboard</h1>
            <p className="text-taupe mt-1">Welcome back</p>
          </div>

          <Suspense fallback={<StatsSkeleton />}>
            <Stats businessId={business.id} />
          </Suspense>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/stamp" className="block bg-primary rounded-3xl p-6 hover:opacity-90 transition-opacity">
              <Stamp size={22} className="text-white mb-3" />
              <h2 className="text-xl font-bold text-white mb-2">Stamp Card →</h2>
              <p className="text-primary-light">Scan a customer&apos;s card to add stamps</p>
            </Link>
            <Link href="/customers" className="block glass-card p-6 hover:shadow-md transition-shadow">
              <Users size={22} className="text-primary mb-3" />
              <h2 className="text-xl font-bold text-primary-dark mb-2">Customers →</h2>
              <p className="text-taupe">View and segment your customers, export data</p>
            </Link>
            <Link href="/offers" className="block glass-card p-6 hover:shadow-md transition-shadow">
              <Send size={22} className="text-primary mb-3" />
              <h2 className="text-xl font-bold text-primary-dark mb-2">Send Offer →</h2>
              <p className="text-taupe">Reach your customers with personalised messages</p>
            </Link>
          </div>
        </div>
      </main>
    </PortalShell>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="glass-card p-6">
      <p className="text-4xl font-black text-primary">{value.toLocaleString()}</p>
      <p className="flex items-center gap-1.5 text-taupe mt-1 font-medium">{icon}{label}</p>
    </div>
  )
}
