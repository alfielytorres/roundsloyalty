import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/is-admin'

// Admin-only: fix a vendor's contact/location fields (address, phone, lat, lng)
// from the ops portal — e.g. when the address autocomplete couldn't resolve one.
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

  const body = await req.json().catch(() => null) as { vendorId?: string; address?: string; phone?: string; lat?: string; lng?: string } | null
  const vendorId = body?.vendorId?.trim()
  if (!vendorId) return NextResponse.json({ error: 'Missing vendorId' }, { status: 400 })

  const address = body?.address?.trim() || null
  const phone = body?.phone?.trim() || null
  const latN = parseFloat(body?.lat ?? '')
  const lngN = parseFloat(body?.lng ?? '')
  const lat = Number.isFinite(latN) ? latN : null
  const lng = Number.isFinite(lngN) ? lngN : null

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error } = await db.from('vendors').update({ address, phone, lat, lng }).eq('id', vendorId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
