import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  const formData = await req.formData()
  const status = formData.get('status') as string
  const notes = (formData.get('notes') as string | null) ?? null

  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('review_proof_of_purchase', {
    p_claim_id: params.id,
    p_new_status: status,
    p_notes: notes,
  })

  if (error) {
    return NextResponse.redirect(new URL(`/claims?error=${encodeURIComponent(error.message)}`, req.url))
  }

  return NextResponse.redirect(new URL('/claims', req.url))
}
