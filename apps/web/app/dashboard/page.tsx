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

  const [membersRes, activityRes] = await Promise.allSettled([
    supabase.from('customer_vendor_memberships').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorId).eq('status', 'active'),
    supabase.from('loyalty_ledger').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorId).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const totalCustomers = membersRes.status === 'fulfilled' ? (membersRes.value.count ?? 0) : 0
  const weekActivity = activityRes.status === 'fulfilled' ? (activityRes.value.count ?? 0) : 0

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <div className="bg-white border border-[#E8E2D9] rounded-3xl p-5 shadow-sm">
        <p className="text-3xl font-black text-[#2563EB]">{totalCustomers.toLocaleString()}</p>
        <p className="flex items-center gap-1.5 text-[#6B7280] mt-1 text-sm font-medium"><Users size={14} />Active members</p>
      </div>
      <div className="bg-white border border-[#E8E2D9] rounded-3xl p-5 shadow-sm">
        <p className="text-3xl font-black text-[#16A34A]">{weekActivity.toLocaleString()}</p>
        <p className="flex items-center gap-1.5 text-[#6B7280] mt-1 text-sm font-medium"><TrendingUp size={14} />Events this week</p>
      </div>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="bg-white border border-[#E8E2D9] rounded-3xl p-5 animate-pulse">
          <div className="h-9 w-16 bg-[#E8E2D9] rounded-xl mb-2" />
          <div className="h-3 w-24 bg-[#F0EDE6] rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export default async function DashboardPage() {
  const { vendor } = await getPortalData()

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-7">
          <p className="text-[#9CA3AF] text-xs font-semibold tracking-widest uppercase mb-0.5">{vendor.business_name}</p>
          <h1 className="text-3xl font-extrabold text-[#111111]">Dashboard</h1>
        </div>

        <Suspense fallback={<StatsSkeleton />}>
          <Stats vendorId={vendor.id} />
        </Suspense>

        <div className="grid grid-cols-1 gap-3">
          <Link href="/stamp" className="flex items-center gap-4 bg-[#16A34A] rounded-3xl p-5 hover:bg-[#15803D] transition-colors shadow-lg shadow-green-200">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Stamp size={22} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white">Scan Card</h2>
              <p className="text-white/75 text-sm">Add stamps or points to a customer&apos;s card</p>
            </div>
          </Link>

          <Link href="/customers" className="flex items-center gap-4 bg-white border border-[#E8E2D9] rounded-3xl p-5 hover:shadow-md transition-shadow shadow-sm">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
              <Users size={22} className="text-[#2563EB]" />
            </div>
            <div>
              <h2 className="font-bold text-[#111111]">Customers</h2>
              <p className="text-[#6B7280] text-sm">View members and segments</p>
            </div>
          </Link>

          <Link href="/claims" className="flex items-center gap-4 bg-white border border-[#E8E2D9] rounded-3xl p-5 hover:shadow-md transition-shadow shadow-sm">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
              <FileCheck size={22} className="text-[#D97706]" />
            </div>
            <div>
              <h2 className="font-bold text-[#111111]">Claims</h2>
              <p className="text-[#6B7280] text-sm">Review proof-of-purchase submissions</p>
            </div>
          </Link>

          <Link href="/activity" className="flex items-center gap-4 bg-white border border-[#E8E2D9] rounded-3xl p-5 hover:shadow-md transition-shadow shadow-sm">
            <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
              <Activity size={22} className="text-[#DC2626]" />
            </div>
            <div>
              <h2 className="font-bold text-[#111111]">Activity</h2>
              <p className="text-[#6B7280] text-sm">Full ledger of stamps, points and rewards</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}
