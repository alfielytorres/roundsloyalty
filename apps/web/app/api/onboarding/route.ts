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
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const formData = await req.formData()
  const business_name = (formData.get('business_name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim()
  const category = (formData.get('category') as string)?.trim() || null

  if (!business_name) {
    return NextResponse.json({ error: 'Business name is required.' }, { status: 400 })
  }

  // Check if vendor already exists to prevent duplicates
  const { data: existing } = await supabase
    .from('vendors')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ success: true, redirect: '/dashboard' }, { status: 200 })
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
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Create owner staff record
  await supabase.from('vendor_staff').insert({
    vendor_id: vendor.id,
    user_id: user.id,
    role: 'owner',
    status: 'active',
  })

  return NextResponse.json({ success: true }, { status: 200 })
}
