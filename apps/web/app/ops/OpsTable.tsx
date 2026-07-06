'use client'

import { useMemo, useState } from 'react'
import { Printer, ExternalLink, Search } from 'lucide-react'

export interface OpsVendor {
  id: string
  business_name: string
  status: string
  category: string | null
  created_at: string | null
  join_token: string | null
  reward_name: string | null
  rounds_required: number | null
}

export default function OpsTable({ vendors }: { vendors: OpsVendor[] }) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return vendors
    return vendors.filter((v) => v.business_name.toLowerCase().includes(s) || (v.category ?? '').toLowerCase().includes(s))
  }, [q, vendors])

  return (
    <>
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/25" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search stores…"
          className="dark-input pl-10"
        />
      </div>

      <div className="glass overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-black/[0.02]">
                {['Store', 'Reward', 'Onboarded', 'Status', 'Sign'].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-black/35 tracking-widest uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-black/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[#1D1D1F]">{v.business_name}</div>
                    {v.category && <div className="text-black/35 text-xs">{v.category}</div>}
                  </td>
                  <td className="px-5 py-4 text-black/55">
                    {v.reward_name && v.rounds_required ? `${v.rounds_required} → ${v.reward_name}` : <span className="text-black/25">No program</span>}
                  </td>
                  <td className="px-5 py-4 text-black/45 whitespace-nowrap">
                    {v.created_at ? new Date(v.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${v.status === 'active' ? 'bg-black/10 text-[#1D1D1F]' : 'bg-black/5 text-black/40'}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {v.join_token ? (
                      <div className="flex items-center gap-2">
                        <a href={`/sign/${v.join_token}`} target="_blank"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-1.5 bg-rounds text-white hover:bg-rounds-hover transition-colors whitespace-nowrap">
                          <Printer size={12} /> Print
                        </a>
                        <a href={`/j/${v.join_token}`} target="_blank"
                          className="inline-flex items-center gap-1 text-xs font-medium text-black/40 hover:text-black/70 transition-colors">
                          <ExternalLink size={12} /> Link
                        </a>
                      </div>
                    ) : <span className="text-black/25 text-xs">—</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-black/35">No stores{q ? ' match your search' : ' yet'}.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
