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
  const program_id = formData.get('program_id') as string | null
  const vendor_id = formData.get('vendor_id') as string
  const name = (formData.get('name') as string)?.trim()
  const rounds_required = parseInt(formData.get('rounds_required') as string)
  const reward_name = (formData.get('reward_name') as string)?.trim()
  const reward_description = (formData.get('reward_description') as string)?.trim() || null
  const reward_expiry_days = parseInt(formData.get('reward_expiry_days') as string) || null
  const default_round_value = parseInt(formData.get('default_round_value') as string) || 1
  const max_round_value = parseInt(formData.get('max_round_value') as string) || 5

  if (!name || !reward_name || !rounds_required) {
    return NextResponse.redirect(new URL('/programs?error=' + encodeURIComponent('Name, reward name, and rounds required are all required.'), req.url))
  }

  const payload = {
    vendor_id,
    name,
    rounds_required,
    reward_name,
    reward_description,
    reward_expiry_days,
    default_round_value,
    max_round_value,
    status: 'active',
  }

  let error
  if (program_id) {
    ;({ error } = await supabase.from('loyalty_programs').update(payload).eq('id', program_id))
  } else {
    ;({ error } = await supabase.from('loyalty_programs').insert(payload))
  }

  if (error) {
    return NextResponse.redirect(new URL('/programs?error=' + encodeURIComponent(error.message), req.url))
  }

  return NextResponse.redirect(new URL('/programs?success=' + encodeURIComponent('Program saved!'), req.url))
}
