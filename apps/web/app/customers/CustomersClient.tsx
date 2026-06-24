'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Download, ChevronRight } from 'lucide-react'
import Modal from '@/components/Modal'

interface Member {
  id: string
  customer_id: string
  status: string
  current_rounds: number
  lifetime_rounds: number
  activated_at: string | null
  profiles: { display_name: string | null } | null
}

const statusBadge: Record<string, string> = {
  active: 'bg-black/10 text-[#1D1D1F]',
  pending: 'bg-black/5 text-black/50',
  inactive: 'bg-black/5 text-black/35',
}

const SEGMENTS = ['all', 'active', 'pending', 'inactive'] as const
type Segment = typeof SEGMENTS[number]

const memberName = (m: Member) => {
  const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
  return (profile as { display_name?: string | null } | null)?.display_name ?? 'Anonymous'
}

export default function CustomersClient({ vendorId, vendorName }: { vendorId: string; vendorName: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [segment, setSegment] = useState<Segment>('all')
  const [selected, setSelected] = useState<Member | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    supabase
      .from('customer_vendor_memberships')
      .select('id, customer_id, status, current_rounds, lifetime_rounds, activated_at, profiles(display_name)')
      .eq('vendor_id', vendorId)
      .order('lifetime_rounds', { ascending: false })
      .limit(500)
      .then(({ data }) => { setMembers((data ?? []) as unknown as Member[]); setLoading(false) })
  }, [vendorId])

  const filtered = segment === 'all' ? members : members.filter(m => m.status === segment)

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-7">
          <div>
            <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-0.5">{vendorName}</p>
            <h1 className="text-2xl font-bold text-[#1D1D1F]">Customers</h1>
          </div>
          <div className="flex gap-2 mt-1">
            <a href={`/api/export?vendor_id=${vendorId}&format=csv`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 text-black/40 text-sm font-semibold hover:border-black/25 hover:text-black/60 transition-colors bg-white/60 backdrop-blur-sm">
              <Download size={13} />CSV
            </a>
            <a href={`/api/export?vendor_id=${vendorId}&format=json`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 text-black/40 text-sm font-semibold hover:border-black/25 hover:text-black/60 transition-colors bg-white/60 backdrop-blur-sm">
              <Download size={13} />JSON
            </a>
          </div>
        </div>

        {/* Filter tabs — instant, no navigation */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {SEGMENTS.map(seg => (
            <button key={seg} onClick={() => setSegment(seg)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors border ${
                segment === seg
                  ? 'bg-[#1D1D1F] text-white border-transparent'
                  : 'bg-white/70 text-black/40 border-black/10 hover:border-black/25 hover:text-black/60'
              }`}>
              {seg.charAt(0).toUpperCase() + seg.slice(1)}
              {seg !== 'all' && !loading && (
                <span className="ml-1.5 text-[10px] opacity-60">
                  {members.filter(m => m.status === seg).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="glass px-6 py-14 flex justify-center">
            <div className="w-5 h-5 border-2 border-black/15 border-t-black/50 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass px-6 py-14 text-center">
            <p className="text-black/40 font-medium">No customers in this segment</p>
          </div>
        ) : (
          <div className="glass overflow-hidden">
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/5 bg-black/[0.02]">
                    {['Customer', 'Status', 'Current rounds', 'Lifetime rounds', 'Joined', ''].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-black/35 tracking-widest uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filtered.map(m => {
                    const name = memberName(m)
                    return (
                      <tr key={m.id} onClick={() => setSelected(m)}
                        className="hover:bg-black/[0.03] transition-colors group cursor-pointer">
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
                        <td className="px-5 py-4"><span className="font-bold text-[#1D1D1F] text-sm">{m.current_rounds ?? 0}</span></td>
                        <td className="px-5 py-4 text-black/60 text-sm font-medium">{m.lifetime_rounds ?? 0}</td>
                        <td className="px-5 py-4 text-black/35 text-sm">{m.activated_at ? new Date(m.activated_at).toLocaleDateString() : '—'}</td>
                        <td className="px-5 py-4 text-right">
                          <ChevronRight size={16} className="inline text-black/20 group-hover:text-black/45 transition-colors" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-black/5">
              {filtered.map(m => {
                const name = memberName(m)
                return (
                  <button key={m.id} onClick={() => setSelected(m)} className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 active:bg-black/[0.03] transition-colors">
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
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Customer">
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-black/8 flex items-center justify-center font-bold text-[#1D1D1F] text-lg shrink-0">
                {memberName(selected).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[#1D1D1F]">{memberName(selected)}</p>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge[selected.status] ?? 'bg-black/5 text-black/35'}`}>
                  {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-black/[0.03] px-4 py-3.5">
                <p className="text-[10px] font-bold tracking-widest uppercase text-black/30 mb-0.5">Current rounds</p>
                <p className="font-black text-[#1D1D1F] text-2xl leading-tight">{selected.current_rounds ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-black/[0.03] px-4 py-3.5">
                <p className="text-[10px] font-bold tracking-widest uppercase text-black/30 mb-0.5">Lifetime rounds</p>
                <p className="font-black text-[#1D1D1F] text-2xl leading-tight">{selected.lifetime_rounds ?? 0}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-black/[0.03] px-4 py-3">
              <p className="text-[10px] font-bold tracking-widest uppercase text-black/30 mb-0.5">Joined</p>
              <p className="font-semibold text-[#1D1D1F] text-sm">
                {selected.activated_at ? new Date(selected.activated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not yet activated'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </main>
  )
}
