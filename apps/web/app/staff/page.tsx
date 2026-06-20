import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import { UserCog } from 'lucide-react'
import AddStaffModal from './AddStaffModal'

interface StaffMember {
  id: string
  user_id: string
  role: string
  status: string
  created_at: string
  profiles: { display_name: string | null; email: string | null } | { display_name: string | null; email: string | null }[] | null
}

const roleBadge: Record<string, string> = {
  owner: 'bg-black/10 text-[#1D1D1F] border-black/15',
  manager: 'bg-black/5 text-black/60 border-black/10',
  staff: 'bg-black/5 text-black/50 border-black/10',
}

async function StaffList({ vendorId, canManage }: { vendorId: string; canManage: boolean }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: staffMembers } = await supabase
    .from('vendor_staff')
    .select('id, user_id, role, status, created_at, profiles(display_name, email)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: true })

  if (!staffMembers?.length) {
    return (
      <div className="glass px-6 py-14 text-center">
        <UserCog className="mx-auto text-black/20 mb-3" size={36} />
        <p className="text-black/40 font-medium">No staff members yet</p>
        <p className="text-black/30 text-sm mt-1">Add staff to give them access to this portal</p>
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
              {['Name', 'Email', 'Role', 'Status', 'Added', ...(canManage ? [''] : [])].map((h, i) => (
                <th key={i} className="text-left px-5 py-3.5 text-xs font-semibold text-black/35 tracking-widest uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {(staffMembers as StaffMember[]).map((m) => {
              const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
              const name = (profile as { display_name?: string | null } | null)?.display_name ?? 'Unknown'
              const email = (profile as { email?: string | null } | null)?.email ?? '—'
              return (
                <tr key={m.id} className="hover:bg-black/[0.02] transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-black/8 flex items-center justify-center font-bold text-[#1D1D1F] text-sm shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-[#1D1D1F] text-sm">{name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-black/40 text-sm">{email}</td>
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
                          <form action="/api/staff/update-role" method="POST" className="flex items-center gap-1">
                            <input type="hidden" name="staff_id" value={m.id} />
                            <select name="role" defaultValue={m.role} className="text-xs border border-black/10 rounded-xl px-2.5 py-1.5 bg-white/80 text-[#1D1D1F] focus:outline-none">
                              <option value="manager">Manager</option>
                              <option value="staff">Staff</option>
                            </select>
                            <button type="submit" className="text-xs font-semibold text-black/50 hover:text-black/80 px-3 py-1.5 rounded-xl hover:bg-black/5 transition-colors">
                              Save
                            </button>
                          </form>
                          {m.status === 'active' && (
                            <form action="/api/staff/remove" method="POST">
                              <input type="hidden" name="staff_id" value={m.id} />
                              <button type="submit" className="text-xs font-semibold text-black/30 hover:text-black/60 px-3 py-1.5 rounded-xl hover:bg-black/5 transition-colors">
                                Remove
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-black/5">
        {(staffMembers as StaffMember[]).map((m) => {
          const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
          const name = (profile as { display_name?: string | null } | null)?.display_name ?? 'Unknown'
          const email = (profile as { email?: string | null } | null)?.email ?? '—'
          return (
            <div key={m.id} className="px-5 py-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-black/8 flex items-center justify-center font-bold text-[#1D1D1F] text-sm shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1D1D1F] text-sm">{name}</p>
                    <p className="text-black/40 text-xs">{email}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${roleBadge[m.role] ?? 'bg-black/5 text-black/40 border-black/10'}`}>
                  {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                </span>
              </div>
              {canManage && m.role !== 'owner' && (
                <div className="flex items-center gap-2 mt-3">
                  <form action="/api/staff/update-role" method="POST" className="flex items-center gap-1">
                    <input type="hidden" name="staff_id" value={m.id} />
                    <select name="role" defaultValue={m.role} className="text-xs border border-black/10 rounded-xl px-2.5 py-1.5 bg-white text-[#1D1D1F]">
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                    </select>
                    <button type="submit" className="text-xs font-semibold text-black/50 px-3 py-1.5 rounded-xl border border-black/10 hover:bg-black/5 transition-colors">
                      Save
                    </button>
                  </form>
                  {m.status === 'active' && (
                    <form action="/api/staff/remove" method="POST">
                      <input type="hidden" name="staff_id" value={m.id} />
                      <button type="submit" className="text-xs font-semibold text-black/30 px-3 py-1.5 rounded-xl border border-black/5 hover:bg-black/5 transition-colors">
                        Remove
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { vendor, role } = await getPortalData()
  const query = await searchParams
  const canManage = role === 'owner' || role === 'manager'

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-7">
          <div>
            <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-0.5">{vendor.business_name}</p>
            <h1 className="text-2xl font-bold text-[#1D1D1F]">Staff</h1>
            <p className="text-black/40 text-sm mt-0.5">Manage who has access to the vendor portal</p>
          </div>
          {canManage && (
            <div className="mt-1">
              <AddStaffModal vendorId={vendor.id} />
            </div>
          )}
        </div>

        {query.error && <div className="mb-5 p-4 bg-black/5 border border-black/10 rounded-2xl text-black/60 text-sm">{query.error}</div>}
        {query.success && <div className="mb-5 p-4 bg-black/5 border border-black/15 rounded-2xl text-black/70 text-sm font-semibold">{query.success}</div>}

        <Suspense fallback={null}>
          <StaffList vendorId={vendor.id} canManage={canManage} />
        </Suspense>
      </div>
    </main>
  )
}
