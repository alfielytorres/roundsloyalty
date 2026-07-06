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

  // Branding fields live on the vendor and are edited from the same form.
  const logo_url = (formData.get('logo_url') as string)?.trim() || null
  const brand_color = (formData.get('brand_color_text') as string)?.trim() || null
  const stamp_icon = (formData.get('stamp_icon') as string)?.trim() || '☕'
  const card_background_url = (formData.get('card_background_url') as string)?.trim() || null
  const stamp_bg_color = (formData.get('stamp_bg_color') as string)?.trim() || null
  // Two-sided card design.
  const card_front_url = (formData.get('card_front_url') as string)?.trim() || null
  const card_front_headline = (formData.get('card_front_headline') as string)?.trim() || null
  const card_front_subtext = (formData.get('card_front_subtext') as string)?.trim() || null
  const card_back_message = (formData.get('card_back_message') as string)?.trim() || null

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

  // Persist branding to the vendor (RLS limits this to owners/staff of the vendor).
  const { error: brandError } = await supabase
    .from('vendors')
    .update({
      logo_url, brand_color, stamp_icon, card_background_url, stamp_bg_color,
      card_front_url, card_front_headline, card_front_subtext, card_back_message,
    })
    .eq('id', vendor_id)

  if (brandError) {
    return NextResponse.redirect(new URL('/programs?error=' + encodeURIComponent(brandError.message), req.url))
  }

  return NextResponse.redirect(new URL('/programs?success=' + encodeURIComponent('Program saved!'), req.url))
}
