import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Saves just the store's contact details (phone + address + coords) during
// onboarding — a focused step, separate from the full Settings page.
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: object }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const { data: staffRecord } = await supabase
    .from('vendor_staff').select('vendor_id, role').eq('user_id', user.id).eq('status', 'active').limit(1).maybeSingle()
  let vendorId = (staffRecord?.role === 'owner' || staffRecord?.role === 'manager') ? staffRecord.vendor_id : null
  if (!vendorId) {
    const { data: owned } = await supabase.from('vendors').select('id').eq('owner_id', user.id).limit(1).maybeSingle()
    vendorId = owned?.id ?? null
  }
  if (!vendorId) return NextResponse.json({ error: 'Permission denied.' }, { status: 403 })

  const fd = await req.formData()
  const phone = (fd.get('phone') as string)?.trim()
  const address = (fd.get('address') as string)?.trim()
  const latN = parseFloat(fd.get('lat') as string)
  const lngN = parseFloat(fd.get('lng') as string)
  const lat = Number.isFinite(latN) ? latN : null
  const lng = Number.isFinite(lngN) ? lngN : null

  if (!phone || !address) return NextResponse.json({ error: 'Phone and address are both required.' }, { status: 400 })

  const { error } = await supabase
    .from('vendors')
    .update({ phone, address, ...(lat != null && lng != null ? { lat, lng } : {}) })
    .eq('id', vendorId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
