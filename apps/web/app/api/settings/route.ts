import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { revalidateVendorCache } from '@/lib/portal-data'

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
  const logo_url = (formData.get('logo_url') as string)?.trim() || null
  const brand_color = (formData.get('brand_color_text') as string)?.trim() || (formData.get('brand_color') as string)?.trim() || null

  if (!business_name) {
    return NextResponse.redirect(new URL('/settings?error=' + encodeURIComponent('Business name is required.'), req.url))
  }

  const { error } = await supabase
    .from('vendors')
    .update({
      business_name,
      description: description || null,
      category,
      address,
      logo_url,
      brand_color,
    })
    .eq('id', vendorId)

  if (error) {
    return NextResponse.redirect(new URL('/settings?error=' + encodeURIComponent(error.message), req.url))
  }

  await revalidateVendorCache()
  return NextResponse.redirect(new URL('/settings?success=' + encodeURIComponent('Changes saved!'), req.url))
}
