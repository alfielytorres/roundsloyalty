import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import { UserCog } from 'lucide-react'

interface StaffMember {
  id: string
  user_id: string
  role: string
  status: string
  created_at: string
  profiles: { display_name: string | null; email: string | null } | { display_name: string | null; email: string | null }[] | null
}

function RoleBadge({ role }: { role: string }) {
  const cls = {
    owner: 'bg-black/10 text-[#1D1D1F] border-black/15',
    manager: 'bg-black/5 text-black/60 border-black/10',
    staff: 'bg-black/5 text-black/50 border-black/10',
  }[role] ?? 'bg-black/5 text-black/40 border-black/10'

  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cls}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  )
}

async function StaffList({ vendorId, currentRole }: { vendorId: string; currentRole: string }) {
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
      <div className="glass rounded-3xl px-6 py-12 text-center ">
        <UserCog className="mx-auto text-black/35 mb-3" size={36} />
        <p className="text-black/40 font-medium">No staff members yet</p>
      </div>
    )
  }

  const canManage = currentRole === 'owner' || currentRole === 'manager'

  return (
    <div className="glass rounded-3xl overflow-hidden ">
      <table className="w-full">
        <thead>
          <tr className="border-b border-black/5">
            {['Name', 'Email', 'Role', 'Status', 'Added', ...(canManage ? ['Actions'] : [])].map((h) => (
              <th key={h} className="text-left px-5 py-4 text-sm font-semibold text-black/35">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(staffMembers as StaffMember[]).map((m) => {
            const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
            const name = (profile as { display_name?: string | null } | null)?.display_name ?? 'Unknown'
            const email = (profile as { email?: string | null } | null)?.email ?? '—'
            return (
              <tr key={m.id} className="border-b border-black/5 hover:bg-black/5 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-black/10 flex items-center justify-center font-bold text-[#1D1D1F] text-sm">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-[#1D1D1F]">{name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-black/40 text-sm">{email}</td>
                <td className="px-5 py-4"><RoleBadge role={m.role} /></td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${m.status === 'active' ? 'bg-black/10 text-[#1D1D1F]' : 'bg-black/5 text-black/40'}`}>
                    {m.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-black/35 text-sm">{new Date(m.created_at).toLocaleDateString()}</td>
                {canManage && (
                  <td className="px-5 py-4">
                    {m.role !== 'owner' && (
                      <div className="flex items-center gap-2">
                        <form action="/api/staff/update-role" method="POST" className="inline flex items-center gap-1">
                          <input type="hidden" name="staff_id" value={m.id} />
                          <select name="role" defaultValue={m.role} className="text-xs border border-black/10 rounded-lg px-2 py-1 bg-white text-[#1D1D1F]">
                            <option value="manager">Manager</option>
                            <option value="staff">Staff</option>
                          </select>
                          <button type="submit" className="text-xs font-semibold text-[] hover:text-[#1D4ED8] px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                            Save
                          </button>
                        </form>
                        {m.status === 'active' && (
                          <form action="/api/staff/remove" method="POST" className="inline">
                            <input type="hidden" name="staff_id" value={m.id} />
                            <button type="submit" className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
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
  )
}

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { vendor, role } = await getPortalData()
  const query = await searchParams
  const canManage = role === 'owner' || role === 'manager'

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-1">{vendor.business_name}</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Staff</h1>
          <p className="text-black/40 mt-1">Manage who has access to the vendor portal</p>
        </div>

        {query.error && <div className="mb-5 p-4 bg-black/5 border border-black/10 rounded-2xl text-black/60 text-sm">{query.error}</div>}
        {query.success && <div className="mb-5 p-4 bg-black/5 border border-black/15 rounded-2xl text-black/70 text-sm font-semibold">{query.success}</div>}

        {canManage && (
          <div className="glass rounded-3xl p-6  mb-6">
            <h2 className="text-base font-bold text-[#1D1D1F] mb-5">Add staff member</h2>
            <form action="/api/staff/add" method="POST" className="flex flex-col gap-4">
              <input type="hidden" name="vendor_id" value={vendor.id} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Email address</label>
                  <input type="email" name="email" required placeholder="staff@example.com" className="w-full dark-input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Role</label>
                  <select name="role" className="w-full dark-input">
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary self-start">Add staff member</button>
            </form>
          </div>
        )}

        <Suspense fallback={null}>
          <StaffList vendorId={vendor.id} currentRole={role} />
        </Suspense>
      </div>
    </main>
  )
}
