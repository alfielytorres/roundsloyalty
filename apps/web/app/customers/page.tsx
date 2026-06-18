import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import PortalShell from '@/components/PortalShell'
import { Download } from 'lucide-react'

async function CustomerTable({ businessId, segment }: { businessId: string; segment: string }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  let query = supabase.from('vendor_customer_segments').select('*').eq('business_id', businessId)
  if (segment !== 'all') query = query.eq('segment', segment)
  const { data: customers } = await query.order('total_visits', { ascending: false })

  return (
    <div className="bg-white/[.07] backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            {['Customer', 'Visits', 'Stamps', 'Last visit', 'Segment'].map((h) => (
              <th key={h} className="text-left px-6 py-4 text-sm font-semibold text-white/40">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {customers?.map((c) => (
            <tr key={c.customer_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#7DB542]/20 flex items-center justify-center font-bold text-[#7DB542] text-sm">
                    {(c.display_name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-white">{c.display_name ?? 'Anonymous'}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-white font-medium">{c.total_visits}</td>
              <td className="px-6 py-4 text-white">{c.stamps_collected}</td>
              <td className="px-6 py-4 text-white/50 text-sm">
                {c.last_visit ? new Date(c.last_visit).toLocaleDateString() : '—'}
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-lg text-xs font-bold capitalize ${segmentClass(c.segment)}`}>
                  {c.segment}
                </span>
              </td>
            </tr>
          ))}
          {!customers?.length && (
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
            {['Customer', 'Visits', 'Stamps', 'Last visit', 'Segment'].map((h) => (
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
              <td className="px-6 py-4"><div className="h-5 w-8 bg-white/10 rounded" /></td>
              <td className="px-6 py-4"><div className="h-5 w-8 bg-white/10 rounded" /></td>
              <td className="px-6 py-4"><div className="h-5 w-24 bg-white/10 rounded" /></td>
              <td className="px-6 py-4"><div className="h-5 w-16 bg-white/10 rounded" /></td>
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
  const { business } = await getPortalData()
  const segment = searchParams.segment ?? 'all'

  return (
    <PortalShell>
      <main className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-extrabold text-white">Customers</h1>
            <div className="flex gap-3">
              <a href={`/api/export?business_id=${business.id}&format=csv`} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-white/20 text-white/70 text-sm font-semibold hover:border-[#7DB542] hover:text-white transition-colors">
                <Download size={14} />Export CSV
              </a>
              <a href={`/api/export?business_id=${business.id}&format=json`} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-white/20 text-white/70 text-sm font-semibold hover:border-[#7DB542] hover:text-white transition-colors">
                <Download size={14} />Export JSON
              </a>
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            {['all', 'top', 'returning', 'at_risk'].map((seg) => (
              <Link key={seg} href={`/customers?segment=${seg}`}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  segment === seg ? 'bg-[#7DB542] text-white' : 'bg-white/[.07] backdrop-blur-sm border border-white/10 text-white/60 hover:text-white'
                }`}>
                {seg === 'at_risk' ? 'At risk' : seg.charAt(0).toUpperCase() + seg.slice(1)}
              </Link>
            ))}
          </div>

          <Suspense fallback={<TableSkeleton />}>
            <CustomerTable businessId={business.id} segment={segment} />
          </Suspense>
        </div>
      </main>
    </PortalShell>
  )
}

function segmentClass(seg: string) {
  switch (seg) {
    case 'top': return 'bg-primary text-white'
    case 'returning': return 'bg-[#7DB542]/20 text-[#D4EDBE]'
    case 'at_risk': return 'bg-red-500/20 text-red-300'
    default: return 'bg-white/10 text-white/50'
  }
}
