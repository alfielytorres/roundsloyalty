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
  const staff_id = formData.get('staff_id') as string
  const role = formData.get('role') as string

  if (!['manager', 'staff'].includes(role)) {
    return NextResponse.redirect(new URL('/staff?error=' + encodeURIComponent('Invalid role.'), req.url))
  }

  const { error } = await supabase
    .from('vendor_staff')
    .update({ role })
    .eq('id', staff_id)

  if (error) {
    return NextResponse.redirect(new URL('/staff?error=' + encodeURIComponent(error.message), req.url))
  }

  return NextResponse.redirect(new URL('/staff?success=' + encodeURIComponent('Role updated.'), req.url))
}
