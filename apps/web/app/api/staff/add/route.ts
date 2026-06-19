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

  const formData = await req.formData()
  const vendor_id = formData.get('vendor_id') as string
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const role = (formData.get('role') as string) ?? 'staff'

  if (!email || !vendor_id) {
    return NextResponse.redirect(new URL('/staff?error=' + encodeURIComponent('Email and vendor ID are required.'), req.url))
  }

  // Look up user by email via profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (!profile) {
    return NextResponse.redirect(
      new URL('/staff?error=' + encodeURIComponent('No user found with that email. They must sign up first.'), req.url),
    )
  }

  // Check if already staff
  const { data: existing } = await supabase
    .from('vendor_staff')
    .select('id, status')
    .eq('vendor_id', vendor_id)
    .eq('user_id', profile.id)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'active') {
      return NextResponse.redirect(new URL('/staff?error=' + encodeURIComponent('This person is already a staff member.'), req.url))
    }
    // Re-activate
    await supabase
      .from('vendor_staff')
      .update({ status: 'active', role })
      .eq('id', existing.id)
  } else {
    const { error } = await supabase.from('vendor_staff').insert({
      vendor_id,
      user_id: profile.id,
      role,
      status: 'active',
    })
    if (error) {
      return NextResponse.redirect(new URL('/staff?error=' + encodeURIComponent(error.message), req.url))
    }
  }

  return NextResponse.redirect(new URL('/staff?success=' + encodeURIComponent('Staff member added!'), req.url))
}
