import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import { Users, TrendingUp, Stamp, FileCheck, Activity } from 'lucide-react'

async function Stats({ vendorId }: { vendorId: string }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [{ count: totalCustomers }, { count: weekActivity }] = await Promise.all([
    supabase
      .from('customer_vendor_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .eq('status', 'active'),
    supabase
      .from('loyalty_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .gte('created_at', weekAgo),
  ])

  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      <StatCard label="Active members" value={totalCustomers ?? 0} icon={<Users size={15} className="text-white/40" />} />
      <StatCard label="Events this week" value={weekActivity ?? 0} icon={<TrendingUp size={15} className="text-white/40" />} />
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
  const { vendor } = await getPortalData()

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-1">{vendor.business_name}</p>
          <h1 className="text-3xl font-extrabold text-white">Dashboard</h1>
        </div>

        <Suspense fallback={<StatsSkeleton />}>
          <Stats vendorId={vendor.id} />
        </Suspense>

        <div className="grid grid-cols-1 gap-3">
          <Link href="/stamp" className="flex items-center gap-4 bg-[#8B5CF6] rounded-3xl p-5 hover:opacity-90 transition-opacity">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Stamp size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white">Scan Card</h2>
              <p className="text-white/70 text-sm">Add stamps or points to a customer's card</p>
            </div>
          </Link>
          <Link href="/customers" className="flex items-center gap-4 glass-card p-5 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-[#8B5CF6]/20 flex items-center justify-center shrink-0">
              <Users size={20} className="text-[#8B5CF6]" />
            </div>
            <div>
              <h2 className="font-bold text-white">Customers</h2>
              <p className="text-white/50 text-sm">View members and segments</p>
            </div>
          </Link>
          <Link href="/claims" className="flex items-center gap-4 glass-card p-5 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-[#8B5CF6]/20 flex items-center justify-center shrink-0">
              <FileCheck size={20} className="text-[#8B5CF6]" />
            </div>
            <div>
              <h2 className="font-bold text-white">Claims</h2>
              <p className="text-white/50 text-sm">Review proof-of-purchase submissions</p>
            </div>
          </Link>
          <Link href="/activity" className="flex items-center gap-4 glass-card p-5 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-[#8B5CF6]/20 flex items-center justify-center shrink-0">
              <Activity size={20} className="text-[#8B5CF6]" />
            </div>
            <div>
              <h2 className="font-bold text-white">Activity</h2>
              <p className="text-white/50 text-sm">Full ledger of stamps, points and rewards</p>
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
      <p className="text-3xl font-black text-[#8B5CF6]">{value.toLocaleString()}</p>
      <p className="flex items-center gap-1.5 text-white/50 mt-1 text-sm font-medium">{icon}{label}</p>
    </div>
  )
}
