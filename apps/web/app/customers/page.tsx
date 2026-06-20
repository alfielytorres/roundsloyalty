import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import { Download } from 'lucide-react'

interface Membership {
  id: string
  customer_id: string
  status: string
  current_rounds: number
  lifetime_rounds: number
  activated_at: string | null
  profiles: { display_name: string | null } | null
}

function statusClass(status: string) {
  switch (status) {
    case 'active': return 'bg-black/10 text-[#1D1D1F]'
    case 'pending': return 'bg-black/5 text-black/60'
    case 'inactive': return 'bg-black/5 text-black/40'
    default: return 'bg-black/5 text-black/40'
  }
}

async function CustomerTable({ vendorId, segment }: { vendorId: string; segment: string }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  let query = supabase
    .from('customer_vendor_memberships')
    .select('id, customer_id, status, current_rounds, lifetime_rounds, activated_at, profiles(display_name)')
    .eq('vendor_id', vendorId)

  if (segment === 'active') query = query.eq('status', 'active')
  else if (segment === 'pending') query = query.eq('status', 'pending')
  else if (segment === 'inactive') query = query.eq('status', 'inactive')

  const { data: members } = await query.order('lifetime_rounds', { ascending: false }).limit(100)

  return (
    <div className="glass rounded-3xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-black/5">
            {['Customer', 'Status', 'Current rounds', 'Lifetime rounds', 'Joined'].map((h) => (
              <th key={h} className="text-left px-6 py-4 text-sm font-semibold text-black/35">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(members as Membership[] | null)?.map((m) => {
            const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
            const name = (profile as { display_name?: string | null } | null)?.display_name ?? 'Anonymous'
            return (
              <tr key={m.id} className="border-b border-black/5 hover:bg-black/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-black/10 flex items-center justify-center font-bold text-[#1D1D1F] text-sm">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-[#1D1D1F]">{name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass(m.status)}`}>{m.status}</span>
                </td>
                <td className="px-6 py-4 text-[#1D1D1F] font-bold">{m.current_rounds ?? 0}</td>
                <td className="px-6 py-4 text-[#1D1D1F]">{m.lifetime_rounds ?? 0}</td>
                <td className="px-6 py-4 text-black/35 text-sm">{m.activated_at ? new Date(m.activated_at).toLocaleDateString() : '—'}</td>
              </tr>
            )
          })}
          {!members?.length && (
            <tr><td colSpan={5} className="px-6 py-12 text-center text-black/35">No customers in this segment.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}


export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ segment?: string }> }) {
  const { vendor } = await getPortalData()
  const query = await searchParams
  const segment = query.segment ?? 'all'

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-7">
          <div>
            <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-0.5">{vendor.business_name}</p>
            <h1 className="text-2xl font-bold text-[#1D1D1F]">Customers</h1>
          </div>
          <div className="flex gap-2 mt-1">
            <a href={`/api/export?vendor_id=${vendor.id}&format=csv`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 text-black/40 text-sm font-semibold hover:border-black/30 hover:text-black/70 transition-colors bg-white/70 backdrop-blur-sm">
              <Download size={13} />CSV
            </a>
            <a href={`/api/export?vendor_id=${vendor.id}&format=json`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 text-black/40 text-sm font-semibold hover:border-black/30 hover:text-black/70 transition-colors bg-white/70 backdrop-blur-sm">
              <Download size={13} />JSON
            </a>
          </div>
        </div>

        <div className="flex gap-2 mb-5 flex-wrap">
          {['all', 'active', 'pending', 'inactive'].map((seg) => (
            <Link key={seg} href={`/customers?segment=${seg}`}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors border ${
                segment === seg
                  ? 'bg-[#1D1D1F] text-white border-transparent'
                  : 'bg-white/70 text-black/40 border-black/10 hover:border-black/30 hover:text-black/70'
              }`}>
              {seg.charAt(0).toUpperCase() + seg.slice(1)}
            </Link>
          ))}
        </div>

        <Suspense fallback={null}>
          <CustomerTable vendorId={vendor.id} segment={segment} />
        </Suspense>
      </div>
    </main>
  )
}
