import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Try vendor_staff first, then fall back to owner lookup
  const { data: staffRecord } = await supabase
    .from('vendor_staff')
    .select('vendor_id, vendors(id, business_name, join_token)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  let vendor = staffRecord?.vendors as unknown as { id: string; business_name: string; join_token: string | null } | null

  if (!vendor) {
    const { data: owned } = await supabase
      .from('vendors')
      .select('id, business_name, join_token')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle()
    vendor = owned
  }

  if (!vendor) {
    return NextResponse.json({ error: 'No vendor found. Complete setup first.' }, { status: 404 })
  }

  if (!vendor?.join_token) {
    return NextResponse.json({ error: 'Vendor join_token not set.' }, { status: 404 })
  }

  // Encode join_token as base64 JSON — safe for customer app to scan
  const payload = Buffer.from(
    JSON.stringify({ join_token: vendor.join_token }),
  ).toString('base64')

  return NextResponse.json({
    payload,
    businessName: vendor.business_name,
    expiresAt: null,
  })
}
