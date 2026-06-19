import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve vendor via vendor_staff
  const { data: staffRecord } = await supabase
    .from('vendor_staff')
    .select('vendor_id, vendors(id, business_name, join_token)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (!staffRecord) {
    return NextResponse.json({ error: 'No vendor found. Complete setup first.' }, { status: 404 })
  }

  const vendor = staffRecord.vendors as unknown as {
    id: string
    business_name: string
    join_token: string | null
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
