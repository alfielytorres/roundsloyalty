import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/sign-in', req.url))

  const formData = await req.formData()
  const programId = formData.get('program_id') as string
  const isActive = formData.get('is_active') === 'true'

  const { data: program } = await supabase
    .from('loyalty_programs')
    .select('vendor_id')
    .eq('id', programId)
    .single()

  if (!program) return NextResponse.redirect(new URL('/programs', req.url))

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id')
    .eq('id', program.vendor_id)
    .eq('owner_id', user.id)
    .single()

  if (!vendor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabase
    .from('loyalty_programs')
    .update({ is_active: isActive })
    .eq('id', programId)

  return NextResponse.redirect(new URL('/programs', req.url))
}
