'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { UserCog, Clock } from 'lucide-react'

interface StaffMember {
  id: string
  user_id: string
  role: string
  status: string
  created_at: string
  profiles: { display_name: string | null; email: string | null } | null
}

const roleBadge: Record<string, string> = {
  owner: 'bg-black/10 text-[#1D1D1F] border-black/15',
  manager: 'bg-black/5 text-black/60 border-black/10',
  staff: 'bg-black/5 text-black/50 border-black/10',
}

export default function StaffClient({
  vendorId, vendorName, canManage, AddStaffModal,
}: {
  vendorId: string
  vendorName: string
  canManage: boolean
  AddStaffModal: React.ReactNode
}) {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [pending, setPending] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    Promise.all([
      supabase.from('vendor_staff')
        .select('id, user_id, role, status, created_at, profiles(display_name, email)')
        .eq('vendor_id', vendorId).eq('status', 'active')
        .order('created_at', { ascending: true }),
      supabase.from('vendor_staff')
        .select('id, user_id, role, status, created_at, profiles(display_name, email)')
        .eq('vendor_id', vendorId).eq('status', 'pending_approval')
        .order('created_at', { ascending: true }),
    ]).then(([activeRes, pendingRes]) => {
      setStaff((activeRes.data ?? []) as unknown as StaffMember[])
      setPending((pendingRes.data ?? []) as unknown as StaffMember[])
      setLoading(false)
    })
  }, [vendorId])

  useEffect(() => { load() }, [load])

  async function action(path: string, body: Record<string, string>) {
    setBusy(body.staff_id)
    await fetch(path, {
      method: 'POST',
      body: new URLSearchParams(body),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    })
    setBusy(null)
    load()
  }

  const getName = (m: StaffMember) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return (p as { display_name?: string | null } | null)?.display_name ?? 'Unknown'
  }
  const getEmail = (m: StaffMember) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return (p as { email?: string | null } | null)?.email ?? '—'
  }

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-7">
          <div>
            <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-0.5">{vendorName}</p>
            <h1 className="text-2xl font-bold text-[#1D1D1F]">Staff</h1>
            <p className="text-black/40 text-sm mt-0.5">Manage who has access to the vendor portal</p>
          </div>
          {canManage && <div className="mt-1">{AddStaffModal}</div>}
        </div>

        {/* Pending requests */}
        {canManage && pending.length > 0 && (
          <div className="glass mb-5 border-black/10">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={15} className="text-black/40" />
              <h2 className="text-sm font-bold text-[#1D1D1F]">Pending requests</h2>
              <span className="ml-auto text-xs font-bold text-black/40 bg-black/5 px-2 py-0.5 rounded-full">{pending.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {pending.map(m => (
                <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-black/[0.02] border border-black/5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-black/8 flex items-center justify-center font-bold text-[#1D1D1F] text-sm shrink-0">
                      {getName(m).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1D1D1F] text-sm truncate">{getName(m)}</p>
                      <p className="text-black/35 text-xs truncate">{getEmail(m)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button disabled={busy === m.id}
                      onClick={() => action('/api/staff/reject', { staff_id: m.id })}
                      className="text-xs font-semibold text-black/35 px-3 py-1.5 rounded-xl border border-black/8 hover:bg-black/5 transition-colors disabled:opacity-40">
                      Reject
                    </button>
                    <button disabled={busy === m.id}
                      onClick={() => action('/api/staff/approve', { staff_id: m.id })}
                      className="text-xs font-semibold text-white bg-[#1D1D1F] px-3 py-1.5 rounded-xl hover:bg-black transition-colors disabled:opacity-40">
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Staff list */}
        {loading ? (
          <div className="glass px-6 py-14 flex justify-center">
            <div className="w-5 h-5 border-2 border-black/15 border-t-black/50 rounded-full animate-spin" />
          </div>
        ) : staff.length === 0 ? (
          <div className="glass px-6 py-14 text-center">
            <UserCog className="mx-auto text-black/20 mb-3" size={36} />
            <p className="text-black/40 font-medium">No staff members yet</p>
            <p className="text-black/30 text-sm mt-1">Add staff to give them access to this portal</p>
          </div>
        ) : (
          <div className="glass overflow-hidden">
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/5 bg-black/[0.02]">
                    {['Name', 'Email', 'Role', 'Status', 'Added', ...(canManage ? [''] : [])].map((h, i) => (
                      <th key={i} className="text-left px-5 py-3.5 text-xs font-semibold text-black/35 tracking-widest uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {staff.map(m => (
                    <tr key={m.id} className="hover:bg-black/[0.02] transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-black/8 flex items-center justify-center font-bold text-[#1D1D1F] text-sm shrink-0">
                            {getName(m).charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-[#1D1D1F] text-sm">{getName(m)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-black/40 text-sm">{getEmail(m)}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${roleBadge[m.role] ?? 'bg-black/5 text-black/40 border-black/10'}`}>
                          {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${m.status === 'active' ? 'bg-black/10 text-[#1D1D1F]' : 'bg-black/5 text-black/35'}`}>
                          {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-black/35 text-sm">{new Date(m.created_at).toLocaleDateString()}</td>
                      {canManage && (
                        <td className="px-5 py-4">
                          {m.role !== 'owner' && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <select defaultValue={m.role}
                                onChange={async e => {
                                  await action('/api/staff/update-role', { staff_id: m.id, role: e.target.value })
                                }}
                                className="text-xs border border-black/10 rounded-xl px-2.5 py-1.5 bg-white/80 text-[#1D1D1F] focus:outline-none">
                                <option value="manager">Manager</option>
                                <option value="staff">Staff</option>
                              </select>
                              <button disabled={busy === m.id}
                                onClick={() => action('/api/staff/remove', { staff_id: m.id })}
                                className="text-xs font-semibold text-black/30 hover:text-black/60 px-3 py-1.5 rounded-xl hover:bg-black/5 transition-colors disabled:opacity-40">
                                Remove
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="sm:hidden divide-y divide-black/5">
              {staff.map(m => (
                <div key={m.id} className="px-5 py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-black/8 flex items-center justify-center font-bold text-[#1D1D1F] text-sm shrink-0">
                        {getName(m).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[#1D1D1F] text-sm">{getName(m)}</p>
                        <p className="text-black/40 text-xs">{getEmail(m)}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${roleBadge[m.role] ?? 'bg-black/5 text-black/40 border-black/10'}`}>
                      {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                    </span>
                  </div>
                  {canManage && m.role !== 'owner' && (
                    <div className="flex items-center gap-2 mt-3">
                      <select defaultValue={m.role}
                        onChange={async e => action('/api/staff/update-role', { staff_id: m.id, role: e.target.value })}
                        className="text-xs border border-black/10 rounded-xl px-2.5 py-1.5 bg-white text-[#1D1D1F]">
                        <option value="manager">Manager</option>
                        <option value="staff">Staff</option>
                      </select>
                      <button disabled={busy === m.id}
                        onClick={() => action('/api/staff/remove', { staff_id: m.id })}
                        className="text-xs font-semibold text-black/30 px-3 py-1.5 rounded-xl border border-black/5 hover:bg-black/5 transition-colors disabled:opacity-40">
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
