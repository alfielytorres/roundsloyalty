'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Share2, ChevronRight } from 'lucide-react'
import Modal from '@/components/Modal'

interface Member {
  id: string
  customer_id: string
  status: string
  current_rounds: number
  lifetime_rounds: number
  activated_at: string | null
  profiles: { display_name: string | null; birthday: string | null } | null
}

const statusBadge: Record<string, string> = {
  active: 'bg-black/10 text-[#1D1D1F]',
  pending: 'bg-black/5 text-black/50',
  inactive: 'bg-black/5 text-black/35',
}

const SEGMENTS = ['all', 'active', 'pending', 'inactive'] as const
type Segment = typeof SEGMENTS[number]

const profileOf = (m: Member) => (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as { display_name?: string | null; birthday?: string | null } | null
const memberName = (m: Member) => profileOf(m)?.display_name ?? 'Anonymous'
const memberBirthday = (m: Member) => profileOf(m)?.birthday ?? null

function ageFrom(birthday: string | null): number | null {
  if (!birthday) return null
  const d = new Date(birthday)
  if (isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const md = now.getMonth() - d.getMonth()
  if (md < 0 || (md === 0 && now.getDate() < d.getDate())) age--
  return age >= 0 && age <= 120 ? age : null
}

const AGE_BUCKETS: { label: string; test: (a: number) => boolean }[] = [
  { label: 'Under 18', test: a => a < 18 },
  { label: '18–24', test: a => a >= 18 && a <= 24 },
  { label: '25–34', test: a => a >= 25 && a <= 34 },
  { label: '35–44', test: a => a >= 35 && a <= 44 },
  { label: '45–54', test: a => a >= 45 && a <= 54 },
  { label: '55+', test: a => a >= 55 },
]

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
      .select('id, customer_id, status, current_rounds, lifetime_rounds, activated_at, profiles(display_name, birthday)')
      .eq('vendor_id', vendorId)
      .order('lifetime_rounds', { ascending: false })
      .limit(500)
      .then(({ data }) => { setMembers((data ?? []) as unknown as Member[]); setLoading(false) })
  }, [vendorId])

  const filtered = segment === 'all' ? members : members.filter(m => m.status === segment)

  // Age distribution across all members with a known birthday.
  const ages = members.map(m => ageFrom(memberBirthday(m))).filter((a): a is number => a !== null)
  const knownAges = ages.length
  const avgAge = knownAges > 0 ? Math.round(ages.reduce((s, a) => s + a, 0) / knownAges) : null
  const buckets = AGE_BUCKETS.map(b => ({ label: b.label, count: ages.filter(b.test).length }))
  const maxBucket = Math.max(1, ...buckets.map(b => b.count))

  function buildExport(format: 'csv' | 'json'): { content: string; mime: string; ext: string } {
    const rows = members.map(m => ({
      name: memberName(m),
      status: m.status,
      current_rounds: m.current_rounds ?? 0,
      lifetime_rounds: m.lifetime_rounds ?? 0,
      birthday: memberBirthday(m) ?? '',
      age: ageFrom(memberBirthday(m)) ?? '',
      joined_at: m.activated_at ?? '',
    }))
    if (format === 'json') return { content: JSON.stringify(rows, null, 2), mime: 'application/json', ext: 'json' }
    const headers = ['name', 'status', 'current_rounds', 'lifetime_rounds', 'birthday', 'age', 'joined_at']
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => JSON.stringify((r as Record<string, unknown>)[h] ?? '')).join(',')),
    ].join('\n')
    return { content: csv, mime: 'text/csv', ext: 'csv' }
  }

  // Hand the file to the native share sheet (AirDrop / Mail / Save to Files);
  // fall back to a direct download where Web Share with files isn't supported.
  async function shareExport(format: 'csv' | 'json') {
    const { content, mime, ext } = buildExport(format)
    const filename = `${vendorName.replace(/\s+/g, '-').toLowerCase() || 'customers'}-customers.${ext}`
    const file = new File([content], filename, { type: mime })
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: `${vendorName} customers` })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return // user dismissed the sheet
        // any other error: fall through to download
      }
    }
    const url = URL.createObjectURL(new Blob([content], { type: mime }))
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-7">
          <div>
            <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-0.5">{vendorName}</p>
            <h1 className="text-2xl font-bold text-[#1D1D1F]">Customers</h1>
          </div>
          <div className="flex gap-2 mt-1">
            <button onClick={() => shareExport('csv')} disabled={loading || members.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 text-black/40 text-sm font-semibold hover:border-black/25 hover:text-black/60 transition-colors bg-white/60 backdrop-blur-sm disabled:opacity-40">
              <Share2 size={13} />CSV
            </button>
            <button onClick={() => shareExport('json')} disabled={loading || members.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 text-black/40 text-sm font-semibold hover:border-black/25 hover:text-black/60 transition-colors bg-white/60 backdrop-blur-sm disabled:opacity-40">
              <Share2 size={13} />JSON
            </button>
          </div>
        </div>

        {/* Age range — who's visiting */}
        {!loading && (
          <div className="glass mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold tracking-widest uppercase text-black/35">Age range</p>
              {knownAges > 0 ? (
                <p className="text-xs text-black/40"><b className="text-[#1D1D1F]">{avgAge}</b> avg · {knownAges} of {members.length} known</p>
              ) : (
                <p className="text-xs text-black/35">No birthdays yet</p>
              )}
            </div>
            {knownAges > 0 ? (
              <div className="flex flex-col gap-2">
                {buckets.map(b => {
                  const pct = Math.round((b.count / maxBucket) * 100)
                  return (
                    <div key={b.label}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="font-semibold text-[#1D1D1F]">{b.label}</span>
                        <span className="tabular-nums text-black/45">{b.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-black/5 overflow-hidden">
                        <div className="h-full rounded-full bg-[#1D1D1F] transition-[width] duration-500" style={{ width: `${Math.max(pct, b.count > 0 ? 5 : 0)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-black/40">Customers can add their birthday in the Rounds app — once they do, their age range shows up here.</p>
            )}
          </div>
        )}

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
                    {['Customer', 'Age', 'Status', 'Current rounds', 'Lifetime rounds', 'Joined', ''].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-black/35 tracking-widest uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filtered.map(m => {
                    const name = memberName(m)
                    const age = ageFrom(memberBirthday(m))
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
                        <td className="px-5 py-4 text-black/45 text-sm tabular-nums">{age ?? '—'}</td>
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
                        <p className="text-black/35 text-xs">
                          {(() => { const a = ageFrom(memberBirthday(m)); return a !== null ? `Age ${a} · ` : '' })()}
                          {m.lifetime_rounds ?? 0} lifetime rounds
                        </p>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-black/[0.03] px-4 py-3">
                <p className="text-[10px] font-bold tracking-widest uppercase text-black/30 mb-0.5">Age</p>
                <p className="font-semibold text-[#1D1D1F] text-sm">
                  {(() => {
                    const a = ageFrom(memberBirthday(selected))
                    const b = memberBirthday(selected)
                    if (a === null) return 'Not shared'
                    return `${a}${b ? ` · ${new Date(b).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}`
                  })()}
                </p>
              </div>
              <div className="rounded-2xl bg-black/[0.03] px-4 py-3">
                <p className="text-[10px] font-bold tracking-widest uppercase text-black/30 mb-0.5">Joined</p>
                <p className="font-semibold text-[#1D1D1F] text-sm">
                  {selected.activated_at ? new Date(selected.activated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not yet activated'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </main>
  )
}
