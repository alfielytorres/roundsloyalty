import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getAdminUser } from '@/lib/is-admin'
import OpsTable, { OpsVendor } from './OpsTable'

// Admin-only ops console: every vendor with a ready-to-print sign link, the
// moment they onboard. Gated to ADMIN_EMAILS — anyone else gets a 404, so the
// page's existence isn't even revealed.
export const dynamic = 'force-dynamic'

export default async function OpsPage() {
  const admin = await getAdminUser()
  if (!admin) notFound()

  // Admin verified — read across all vendors with the service role (RLS would
  // otherwise scope to a single vendor).
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: vendorRows } = await db
    .from('vendors')
    .select('id, business_name, status, category, created_at, join_token')
    .order('created_at', { ascending: false })

  const { data: programRows } = await db
    .from('loyalty_programs')
    .select('vendor_id, reward_name, rounds_required')
    .eq('status', 'active')

  const programByVendor = new Map((programRows ?? []).map((p) => [p.vendor_id, p]))
  const vendors: OpsVendor[] = (vendorRows ?? []).map((v) => {
    const p = programByVendor.get(v.id)
    return { ...v, reward_name: p?.reward_name ?? null, rounds_required: p?.rounds_required ?? null }
  })

  const activeCount = vendors.filter((v) => v.status === 'active').length

  return (
    <main className="px-5 py-10 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-7">
          <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-0.5">Rounds · Ops</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Store signs</h1>
          <p className="text-black/40 text-sm mt-0.5">
            {vendors.length} store{vendors.length === 1 ? '' : 's'} · {activeCount} active — print a counter sign and ship it.
          </p>
        </div>
        <OpsTable vendors={vendors} />
      </div>
    </main>
  )
}
