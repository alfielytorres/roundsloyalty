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
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/', req.url))

  const formData = await req.formData()
  const business_name = (formData.get('business_name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim()
  const category = (formData.get('category') as string)?.trim() || null

  if (!business_name) {
    return NextResponse.redirect(
      new URL(`/onboarding?error=${encodeURIComponent('Business name is required.')}`, req.url),
    )
  }

  const { data: vendor, error } = await supabase
    .from('vendors')
    .insert({
      owner_id: user.id,
      business_name,
      description: description || null,
      category,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.redirect(
      new URL(`/onboarding?error=${encodeURIComponent(error.message)}`, req.url),
    )
  }

  await supabase.from('vendor_staff').insert({
    vendor_id: vendor.id,
    user_id: user.id,
    role: 'owner',
  })

  return NextResponse.redirect(new URL('/dashboard', req.url))
}
