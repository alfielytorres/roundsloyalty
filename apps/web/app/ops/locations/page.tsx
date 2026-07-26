import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { isAdminEmail } from '@/lib/is-admin'
import OpsNav from '../OpsNav'
import LocationsEditor, { VendorGroup } from './LocationsEditor'

// Admin-only: manage the individual map locations (vendor_locations) — fix an
// address or drop lat/lng by hand for locations the autocomplete couldn't
// resolve. Same gating as the rest of /ops.
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
  const [{ data: vendorRows }, { data: locRows }] = await Promise.all([
    db.from('vendors').select('id, business_name, created_at').order('created_at', { ascending: false }),
    db.from('vendor_locations').select('id, vendor_id, name, address, lat, lng').order('created_at', { ascending: true }),
  ])

  const locsByVendor = new Map<string, VendorGroup['locations']>()
  for (const l of locRows ?? []) {
    const arr = locsByVendor.get(l.vendor_id) ?? []
    arr.push({ id: l.id, name: l.name ?? '', address: l.address ?? '', lat: l.lat != null ? String(l.lat) : '', lng: l.lng != null ? String(l.lng) : '' })
    locsByVendor.set(l.vendor_id, arr)
  }

  const vendors: VendorGroup[] = (vendorRows ?? []).map((v) => ({
    id: v.id,
    name: v.business_name ?? 'Store',
    locations: locsByVendor.get(v.id) ?? [],
  }))

  const totalLocations = locRows?.length ?? 0
  const unpinned = (locRows ?? []).filter((l) => l.lat == null || l.lng == null).length

  return (
    <main className="px-5 py-10 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <OpsNav />
        <div className="mb-7">
          <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-0.5">Weekends Club · Ops</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Locations</h1>
          <p className="text-black/40 text-sm mt-0.5">
            {totalLocations} map location{totalLocations === 1 ? '' : 's'}{unpinned > 0 ? ` · ${unpinned} missing coordinates` : ''} — fix an address or drop lat/lng by hand.
          </p>
        </div>
        <LocationsEditor vendors={vendors} />
      </div>
    </main>
  )
}
