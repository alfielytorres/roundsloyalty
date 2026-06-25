'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { UserCog, Clock, ChevronRight } from 'lucide-react'
import Modal from '@/components/Modal'
import Spinner from '@/components/Spinner'

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
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [selected, setSelected] = useState<StaffMember | null>(null)

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

  async function action(path: string, body: Record<string, string>, key?: string) {
    setBusy(body.staff_id)
    setPendingKey(key ?? body.staff_id)
    await fetch(path, {
      method: 'POST',
      body: new URLSearchParams(body),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    })
    setBusy(null)
    setPendingKey(null)
    load()
  }

  async function changeRole(staffId: string, role: string) {
    await action('/api/staff/update-role', { staff_id: staffId, role }, `role:${role}`)
    setSelected(prev => prev && prev.id === staffId ? { ...prev, role } : prev)
  }

  async function removeStaff(staffId: string) {
    await action('/api/staff/remove', { staff_id: staffId }, 'remove')
    setSelected(null)
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
                      onClick={() => action('/api/staff/reject', { staff_id: m.id }, `reject:${m.id}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/35 px-3 py-1.5 rounded-xl border border-black/8 hover:bg-black/5 transition-colors disabled:opacity-40">
                      {pendingKey === `reject:${m.id}` && <Spinner size={12} />}Reject
                    </button>
                    <button disabled={busy === m.id}
                      onClick={() => action('/api/staff/approve', { staff_id: m.id }, `approve:${m.id}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#1D1D1F] px-3 py-1.5 rounded-xl hover:bg-black transition-colors disabled:opacity-40">
                      {pendingKey === `approve:${m.id}` && <Spinner size={12} />}Approve
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
                    {['Name', 'Email', 'Role', 'Status', 'Added', ''].map((h, i) => (
                      <th key={i} className="text-left px-5 py-3.5 text-xs font-semibold text-black/35 tracking-widest uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {staff.map(m => (
                    <tr key={m.id} onClick={() => setSelected(m)}
                      className="hover:bg-black/[0.03] transition-colors group cursor-pointer">
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
                      <td className="px-5 py-4 text-right">
                        <ChevronRight size={16} className="inline text-black/20 group-hover:text-black/45 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="sm:hidden divide-y divide-black/5">
              {staff.map(m => (
                <button key={m.id} onClick={() => setSelected(m)} className="w-full text-left px-5 py-4 active:bg-black/[0.03] transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-black/8 flex items-center justify-center font-bold text-[#1D1D1F] text-sm shrink-0">
                        {getName(m).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1D1D1F] text-sm truncate">{getName(m)}</p>
                        <p className="text-black/40 text-xs truncate">{getEmail(m)}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${roleBadge[m.role] ?? 'bg-black/5 text-black/40 border-black/10'}`}>
                      {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Staff member">
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-black/8 flex items-center justify-center font-bold text-[#1D1D1F] text-lg shrink-0">
                {getName(selected).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[#1D1D1F]">{getName(selected)}</p>
                <p className="text-black/40 text-sm truncate">{getEmail(selected)}</p>
              </div>
              <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${roleBadge[selected.role] ?? 'bg-black/5 text-black/40 border-black/10'}`}>
                {selected.role.charAt(0).toUpperCase() + selected.role.slice(1)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-black/[0.03] px-4 py-3">
                <p className="text-[10px] font-bold tracking-widest uppercase text-black/30 mb-0.5">Status</p>
                <p className="font-semibold text-[#1D1D1F] text-sm">{selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}</p>
              </div>
              <div className="rounded-2xl bg-black/[0.03] px-4 py-3">
                <p className="text-[10px] font-bold tracking-widest uppercase text-black/30 mb-0.5">Added</p>
                <p className="font-semibold text-[#1D1D1F] text-sm">{new Date(selected.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {canManage && selected.role !== 'owner' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-black/45 tracking-wide uppercase mb-1.5">Role</label>
                  <div className="flex gap-2">
                    {(['manager', 'staff'] as const).map(r => (
                      <button key={r} disabled={busy === selected.id}
                        onClick={() => changeRole(selected.id, r)}
                        className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-40 ${
                          selected.role === r
                            ? 'bg-[#1D1D1F] text-white border-transparent'
                            : 'bg-white text-black/50 border-black/10 hover:border-black/25'
                        }`}>
                        {pendingKey === `role:${r}` && <Spinner size={13} />}{r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <button disabled={busy === selected.id}
                  onClick={() => removeStaff(selected.id)}
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-red-500/80 px-3.5 py-2.5 rounded-xl border border-red-500/15 hover:bg-red-500/5 transition-colors disabled:opacity-40">
                  {pendingKey === 'remove' && <Spinner size={14} />}Remove from staff
                </button>
              </>
            ) : (
              <p className="text-sm text-black/35">
                {selected.role === 'owner' ? 'The owner cannot be edited or removed.' : 'You do not have permission to edit staff.'}
              </p>
            )}
          </div>
        )}
      </Modal>
    </main>
  )
}
