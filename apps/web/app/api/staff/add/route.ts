import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
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
  const role = ((formData.get('role') as string) === 'manager') ? 'manager' : 'staff'

  if (!email || !vendor_id) {
    return NextResponse.redirect(new URL('/staff?error=' + encodeURIComponent('Email and vendor ID are required.'), req.url))
  }

  // Verify the requester may manage this vendor (owner or active manager).
  const { data: ownVendor } = await supabase.from('vendors').select('id').eq('id', vendor_id).eq('owner_id', user.id).maybeSingle()
  let canManage = !!ownVendor
  if (!canManage) {
    const { data: mgr } = await supabase
      .from('vendor_staff').select('id')
      .eq('vendor_id', vendor_id).eq('user_id', user.id).eq('role', 'manager').eq('status', 'active')
      .maybeSingle()
    canManage = !!mgr
  }
  if (!canManage) {
    return NextResponse.redirect(new URL('/staff?error=' + encodeURIComponent('You do not have permission to add staff.'), req.url))
  }

  // Service role: look up the target user by email and write — the requester
  // can't read arbitrary profiles, and managers can't satisfy the RLS insert.
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: profile } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
  if (!profile) {
    return NextResponse.redirect(
      new URL('/staff?error=' + encodeURIComponent('No user found with that email. They must sign up first.'), req.url),
    )
  }

  const { data: existing } = await admin
    .from('vendor_staff').select('id, status')
    .eq('vendor_id', vendor_id).eq('user_id', profile.id)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'active') {
      return NextResponse.redirect(new URL('/staff?error=' + encodeURIComponent('This person is already a staff member.'), req.url))
    }
    await admin.from('vendor_staff').update({ status: 'active', role }).eq('id', existing.id)
  } else {
    const { error } = await admin.from('vendor_staff').insert({ vendor_id, user_id: profile.id, role, status: 'active' })
    if (error) {
      return NextResponse.redirect(new URL('/staff?error=' + encodeURIComponent(error.message), req.url))
    }
  }

  return NextResponse.redirect(new URL('/staff?success=' + encodeURIComponent('Staff member added!'), req.url))
}
