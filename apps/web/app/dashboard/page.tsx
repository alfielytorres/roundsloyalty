import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
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
    <div className="grid grid-cols-2 gap-4 mb-8">
      <StatCard label="Total customers" value={totalCustomers ?? 0} icon={<Users size={15} className="text-white/40" />} />
      <StatCard label="Visits this week" value={weekVisits ?? 0} icon={<TrendingUp size={15} className="text-white/40" />} />
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="glass-card p-6 animate-pulse">
          <div className="h-9 w-16 bg-white/10 rounded-xl mb-2" />
          <div className="h-3 w-24 bg-white/5 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export default async function DashboardPage() {
  const { business } = await getPortalData()

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-1">{business.name}</p>
          <h1 className="text-3xl font-extrabold text-white">Dashboard</h1>
        </div>

        <Suspense fallback={<StatsSkeleton />}>
          <Stats businessId={business.id} />
        </Suspense>

        <div className="grid grid-cols-1 gap-3">
          <Link href="/stamp" className="flex items-center gap-4 bg-[#7DB542] rounded-3xl p-5 hover:opacity-90 transition-opacity">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Stamp size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white">Stamp Card</h2>
              <p className="text-white/70 text-sm">Scan a customer’s card to add stamps</p>
            </div>
          </Link>
          <Link href="/customers" className="flex items-center gap-4 glass-card p-5 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-[#7DB542]/20 flex items-center justify-center shrink-0">
              <Users size={20} className="text-[#7DB542]" />
            </div>
            <div>
              <h2 className="font-bold text-white">Customers</h2>
              <p className="text-white/50 text-sm">View segments, export data</p>
            </div>
          </Link>
          <Link href="/offers" className="flex items-center gap-4 glass-card p-5 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-[#7DB542]/20 flex items-center justify-center shrink-0">
              <Send size={20} className="text-[#7DB542]" />
            </div>
            <div>
              <h2 className="font-bold text-white">Send Offer</h2>
              <p className="text-white/50 text-sm">Reach customers with personalised messages</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="glass-card p-5">
      <p className="text-3xl font-black text-[#7DB542]">{value.toLocaleString()}</p>
      <p className="flex items-center gap-1.5 text-white/50 mt-1 text-sm font-medium">{icon}{label}</p>
    </div>
  )
}
