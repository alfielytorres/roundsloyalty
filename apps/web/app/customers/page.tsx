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
  profiles: { display_name: string | null } | { display_name: string | null }[] | null
}

const statusBadge: Record<string, string> = {
  active: 'bg-black/10 text-[#1D1D1F]',
  pending: 'bg-black/5 text-black/50',
  inactive: 'bg-black/5 text-black/35',
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

  if (!members?.length) {
    return (
      <div className="glass px-6 py-14 text-center">
        <p className="text-black/40 font-medium">No customers in this segment</p>
      </div>
    )
  }

  return (
    <div className="glass overflow-hidden">
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/5 bg-black/[0.02]">
              {['Customer', 'Status', 'Current rounds', 'Lifetime rounds', 'Joined'].map((h) => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-black/35 tracking-widest uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {(members as Membership[]).map((m) => {
              const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
              const name = (profile as { display_name?: string | null } | null)?.display_name ?? 'Anonymous'
              return (
                <tr key={m.id} className="hover:bg-black/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-black/8 flex items-center justify-center font-bold text-[#1D1D1F] text-sm shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-[#1D1D1F] text-sm">{name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge[m.status] ?? 'bg-black/5 text-black/35'}`}>
                      {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-bold text-[#1D1D1F] text-sm">{m.current_rounds ?? 0}</span>
                  </td>
                  <td className="px-5 py-4 text-black/60 text-sm font-medium">{m.lifetime_rounds ?? 0}</td>
                  <td className="px-5 py-4 text-black/35 text-sm">{m.activated_at ? new Date(m.activated_at).toLocaleDateString() : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-black/5">
        {(members as Membership[]).map((m) => {
          const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
          const name = (profile as { display_name?: string | null } | null)?.display_name ?? 'Anonymous'
          return (
            <div key={m.id} className="px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-black/8 flex items-center justify-center font-bold text-[#1D1D1F] text-sm shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[#1D1D1F] text-sm truncate">{name}</p>
                  <p className="text-black/35 text-xs">{m.lifetime_rounds ?? 0} lifetime rounds</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-[#1D1D1F] text-xl leading-none">{m.current_rounds ?? 0}</p>
                <p className="text-black/30 text-[10px] uppercase tracking-wide mt-0.5">rounds</p>
              </div>
            </div>
          )
        })}
      </div>
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
            <a href={`/api/export?vendor_id=${vendor.id}&format=csv`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 text-black/40 text-sm font-semibold hover:border-black/25 hover:text-black/60 transition-colors bg-white/60 backdrop-blur-sm">
              <Download size={13} />CSV
            </a>
            <a href={`/api/export?vendor_id=${vendor.id}&format=json`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 text-black/40 text-sm font-semibold hover:border-black/25 hover:text-black/60 transition-colors bg-white/60 backdrop-blur-sm">
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
                  : 'bg-white/70 text-black/40 border-black/10 hover:border-black/25 hover:text-black/60'
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
