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
  const enabled = formData.get('enabled') === 'true'
  const instructions = (formData.get('instructions') as string)?.trim() || null
  const max_days_raw = parseInt(formData.get('max_claim_age_days') as string)
  const max_claim_age_days = isNaN(max_days_raw) ? 30 : Math.max(1, Math.min(365, max_days_raw))

  const { error } = await supabase
    .from('vendors')
    .update({
      proof_of_purchase_enabled: enabled,
      proof_of_purchase_instructions: instructions,
      proof_of_purchase_max_claim_age_days: max_claim_age_days,
    })
    .eq('owner_id', user.id)

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error.message)}`, req.url),
    )
  }

  return NextResponse.redirect(
    new URL('/settings?success=' + encodeURIComponent('Proof of purchase settings saved!'), req.url),
  )
}
