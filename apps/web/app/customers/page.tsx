import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import { Download } from 'lucide-react'

type MemberRow = {
  id: string
  customer_id: string
  status: string
  stamps_balance: number
  points_balance: number
  total_visits: number
  last_visit_at: string | null
  profiles: { display_name: string | null } | null
}

async function CustomerTable({ vendorId, segment }: { vendorId: string; segment: string }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  let query = supabase
    .from('customer_vendor_memberships')
    .select('id, customer_id, status, total_visits, last_visit_at, profiles(display_name), loyalty_balances(stamps_balance, points_balance)')
    .eq('vendor_id', vendorId)

  if (segment === 'active') query = query.eq('status', 'active')
  else if (segment === 'pending') query = query.eq('status', 'pending')
  else if (segment === 'inactive') query = query.eq('status', 'inactive')

  const { data: members } = await query.order('total_visits', { ascending: false }).limit(100)

  return (
    <div className="bg-white/[.07] backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            {['Customer', 'Status', 'Visits', 'Stamps', 'Last visit'].map((h) => (
              <th key={h} className="text-left px-6 py-4 text-sm font-semibold text-white/40">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members?.map((m) => {
            const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
            const balance = Array.isArray(m.loyalty_balances) ? m.loyalty_balances[0] : m.loyalty_balances
            const name = (profile as { display_name?: string | null } | null)?.display_name ?? 'Anonymous'
            const stamps = (balance as { stamps_balance?: number } | null)?.stamps_balance ?? 0
            return (
              <tr key={m.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center font-bold text-[#8B5CF6] text-sm">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-white">{name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass(m.status)}`}>
                    {m.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-white font-medium">{m.total_visits ?? 0}</td>
                <td className="px-6 py-4 text-white">{stamps}</td>
                <td className="px-6 py-4 text-white/50 text-sm">
                  {m.last_visit_at ? new Date(m.last_visit_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            )
          })}
          {!members?.length && (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-white/40">No customers in this segment.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="bg-white/[.07] backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden animate-pulse">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            {['Customer', 'Status', 'Visits', 'Stamps', 'Last visit'].map((h) => (
              <th key={h} className="text-left px-6 py-4">
                <div className="h-4 w-16 bg-white/10 rounded" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(5)].map((_, i) => (
            <tr key={i} className="border-b border-white/5">
              <td className="px-6 py-4"><div className="h-5 w-32 bg-white/10 rounded" /></td>
              <td className="px-6 py-4"><div className="h-5 w-16 bg-white/10 rounded" /></td>
              <td className="px-6 py-4"><div className="h-5 w-8 bg-white/10 rounded" /></td>
              <td className="px-6 py-4"><div className="h-5 w-8 bg-white/10 rounded" /></td>
              <td className="px-6 py-4"><div className="h-5 w-24 bg-white/10 rounded" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { segment?: string }
}) {
  const { vendor } = await getPortalData()
  const segment = searchParams.segment ?? 'all'

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-1">{vendor.business_name}</p>
            <h1 className="text-3xl font-extrabold text-white">Customers</h1>
          </div>
          <div className="flex gap-2 mt-1">
            <a href={`/api/export?vendor_id=${vendor.id}&format=csv`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/20 text-white/60 text-sm font-semibold hover:border-[#8B5CF6] hover:text-white transition-colors">
              <Download size={13} />CSV
            </a>
            <a href={`/api/export?vendor_id=${vendor.id}&format=json`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/20 text-white/60 text-sm font-semibold hover:border-[#8B5CF6] hover:text-white transition-colors">
              <Download size={13} />JSON
            </a>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {['all', 'active', 'pending', 'inactive'].map((seg) => (
            <Link key={seg} href={`/customers?segment=${seg}`}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                segment === seg ? 'bg-[#8B5CF6] text-white' : 'bg-white/[.07] border border-white/10 text-white/50 hover:text-white'
              }`}>
              {seg.charAt(0).toUpperCase() + seg.slice(1)}
            </Link>
          ))}
        </div>

        <Suspense fallback={<TableSkeleton />}>
          <CustomerTable vendorId={vendor.id} segment={segment} />
        </Suspense>
      </div>
    </main>
  )
}

function statusClass(status: string) {
  switch (status) {
    case 'active': return 'bg-emerald-500/20 text-emerald-300'
    case 'pending': return 'bg-yellow-500/20 text-yellow-300'
    case 'inactive': return 'bg-white/10 text-white/50'
    default: return 'bg-white/10 text-white/50'
  }
}
