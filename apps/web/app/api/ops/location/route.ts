import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/is-admin'

// Admin-only: manage the individual map locations (vendor_locations) from the
// ops portal — set/fix a location's address + lat/lng when the autocomplete
// couldn't resolve it, add a new one, or delete one.
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )
  const { data: { user } } = await auth.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as
    | { action?: string; id?: string; vendorId?: string; name?: string; address?: string; lat?: string; lng?: string }
    | null
  if (!body) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  if (body.action === 'delete') {
    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const { error } = await db.from('vendor_locations').delete().eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const name = body.name?.trim() || null
  const address = body.address?.trim() || null
  const latN = parseFloat(body.lat ?? '')
  const lngN = parseFloat(body.lng ?? '')
  const lat = Number.isFinite(latN) ? latN : null
  const lng = Number.isFinite(lngN) ? lngN : null

  if (body.id) {
    // Update existing location.
    const { error } = await db.from('vendor_locations')
      .update({ ...(name ? { name } : {}), address, lat, lng })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Insert a new location for a vendor.
  if (!body.vendorId || !name) return NextResponse.json({ error: 'Missing vendor or name' }, { status: 400 })
  const { data, error } = await db.from('vendor_locations')
    .insert({ vendor_id: body.vendorId, name, address, lat, lng })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}
