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
        setAll: (cs: { name: string; value: string; options?: object }[]) => {
          cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { vendor_id } = await req.json()
  if (!vendor_id) return NextResponse.json({ error: 'Missing vendor_id' }, { status: 400 })

  // Check not already a member
  const { data: existing } = await supabase
    .from('vendor_staff')
    .select('id, status')
    .eq('vendor_id', vendor_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const msg = existing.status === 'pending_approval'
      ? 'You already have a pending request for this store.'
      : 'You are already a member of this store.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { error } = await supabase.from('vendor_staff').insert({
    vendor_id,
    user_id: user.id,
    role: 'staff',
    status: 'pending_approval',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
