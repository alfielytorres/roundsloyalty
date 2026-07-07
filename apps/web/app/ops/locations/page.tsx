import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { isAdminEmail } from '@/lib/is-admin'
import OpsNav from '../OpsNav'
import LocationsEditor, { VendorLoc } from './LocationsEditor'

// Admin-only: fix vendor contact + map location (address, phone, lat, lng) when
// the address autocomplete couldn't resolve one. Same gating as the rest of /ops.
export const dynamic = 'force-dynamic'

export default async function OpsLocationsPage() {
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/')
  if (!isAdminEmail(user.email)) notFound()

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await db
    .from('vendors')
    .select('id, business_name, address, phone, lat, lng, created_at')
    .order('created_at', { ascending: false })

  const vendors: VendorLoc[] = (data ?? []).map((v) => ({
    id: v.id,
    name: v.business_name ?? 'Store',
    address: v.address ?? '',
    phone: v.phone ?? '',
    lat: v.lat != null ? String(v.lat) : '',
    lng: v.lng != null ? String(v.lng) : '',
  }))

  const pinned = vendors.filter((v) => v.lat && v.lng).length

  return (
    <main className="px-5 py-10 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <OpsNav />
        <div className="mb-7">
          <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-0.5">Rounds · Ops</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Locations</h1>
          <p className="text-black/40 text-sm mt-0.5">
            {vendors.length} store{vendors.length === 1 ? '' : 's'} · {pinned} pinned — fix an address or drop map coordinates manually.
          </p>
        </div>
        <LocationsEditor vendors={vendors} />
      </div>
    </main>
  )
}
