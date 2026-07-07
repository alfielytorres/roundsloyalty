import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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
  if (!user) return NextResponse.redirect(new URL('/', req.url))

  // Resolve vendor via vendor_staff
  const { data: staffRecord } = await supabase
    .from('vendor_staff')
    .select('vendor_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  let vendorId = (staffRecord?.role === 'owner' || staffRecord?.role === 'manager') ? staffRecord.vendor_id : null
  if (!vendorId) {
    const { data: owned } = await supabase.from('vendors').select('id').eq('owner_id', user.id).limit(1).maybeSingle()
    vendorId = owned?.id ?? null
  }
  if (!vendorId) {
    return NextResponse.redirect(new URL('/settings?error=' + encodeURIComponent('Permission denied.'), req.url))
  }

  const formData = await req.formData()
  const business_name = (formData.get('business_name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim()
  const category = (formData.get('category') as string)?.trim() || null
  const address = (formData.get('address') as string)?.trim() || null
  const phone = (formData.get('phone') as string)?.trim() || null
  // Coords come from the address autocomplete; blank when the address was typed
  // manually (ops can pin the map location later).
  const latRaw = parseFloat((formData.get('lat') as string) ?? '')
  const lngRaw = parseFloat((formData.get('lng') as string) ?? '')
  const lat = Number.isFinite(latRaw) ? latRaw : null
  const lng = Number.isFinite(lngRaw) ? lngRaw : null

  if (!business_name) {
    return NextResponse.redirect(new URL('/settings?error=' + encodeURIComponent('Business name is required.'), req.url))
  }

  // Branding (logo/colour/stamp/background) is edited on the Programs page, so
  // this form only updates business details — it must not clobber branding.
  // lat/lng only overwrite when the autocomplete resolved them, so a manual
  // address edit doesn't wipe coordinates ops may have set.
  const { error } = await supabase
    .from('vendors')
    .update({
      business_name,
      description: description || null,
      category,
      address,
      phone,
      ...(lat != null && lng != null ? { lat, lng } : {}),
    })
    .eq('id', vendorId)

  if (error) {
    return NextResponse.redirect(new URL('/settings?error=' + encodeURIComponent(error.message), req.url))
  }

  return NextResponse.redirect(new URL('/settings?success=' + encodeURIComponent('Changes saved!'), req.url))
}
