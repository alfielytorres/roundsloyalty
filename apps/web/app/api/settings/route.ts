import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
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

  const formData = await req.formData()
  const business_name = (formData.get('business_name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim()
  const address = (formData.get('address') as string)?.trim() || null
  const lat = formData.get('lat') ? parseFloat(formData.get('lat') as string) : null
  const lng = formData.get('lng') ? parseFloat(formData.get('lng') as string) : null

  if (!business_name) {
    return NextResponse.redirect(
      new URL('/settings?error=' + encodeURIComponent('Business name is required.'), req.url),
    )
  }

  const { error } = await supabase
    .from('vendors')
    .update({
      business_name,
      description: description || null,
    })
    .eq('owner_id', user.id)

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error.message)}`, req.url),
    )
  }

  // Keep businesses table in sync (name, description, address, lat/lng for iOS map)
  const businessUpdate: Record<string, unknown> = { name: business_name, description: description || null }
  if (address !== null) businessUpdate.address = address
  if (lat !== null && !isNaN(lat)) businessUpdate.lat = lat
  if (lng !== null && !isNaN(lng)) businessUpdate.lng = lng

  await supabase
    .from('businesses')
    .update(businessUpdate)
    .eq('owner_id', user.id)

  return NextResponse.redirect(
    new URL('/settings?success=' + encodeURIComponent('Changes saved!'), req.url),
  )
}
