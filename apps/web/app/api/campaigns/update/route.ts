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
  const campaign_id = formData.get('campaign_id') as string
  const name = (formData.get('name') as string)?.trim()
  const round_value = parseInt(formData.get('round_value') as string)
  const starts_at = formData.get('starts_at') as string
  const ends_at = formData.get('ends_at') as string
  const customer_message = (formData.get('customer_message') as string)?.trim() || null

  if (!campaign_id || !name || !starts_at || !ends_at || !round_value) {
    return NextResponse.redirect(new URL('/campaigns?error=' + encodeURIComponent('All required fields must be filled in.'), req.url))
  }

  if (new Date(ends_at) <= new Date(starts_at)) {
    return NextResponse.redirect(new URL('/campaigns?error=' + encodeURIComponent('End date must be after start date.'), req.url))
  }

  if (round_value < 2 || round_value > 10) {
    return NextResponse.redirect(new URL('/campaigns?error=' + encodeURIComponent('Round value must be between 2 and 10.'), req.url))
  }

  // Load the campaign so we know its vendor and can't edit ended/cancelled ones.
  const { data: existing } = await supabase
    .from('round_campaigns')
    .select('id, vendor_id, status, ends_at')
    .eq('id', campaign_id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.redirect(new URL('/campaigns?error=' + encodeURIComponent('Campaign not found.'), req.url))
  }
  if (existing.status === 'cancelled' || new Date(existing.ends_at) <= new Date()) {
    return NextResponse.redirect(new URL('/campaigns?error=' + encodeURIComponent('This campaign has ended and can no longer be edited.'), req.url))
  }

  // Reject overlap with OTHER scheduled campaigns for the same vendor.
  const { data: overlapping } = await supabase
    .from('round_campaigns')
    .select('id, name')
    .eq('vendor_id', existing.vendor_id)
    .eq('status', 'scheduled')
    .neq('id', campaign_id)
    .lt('starts_at', ends_at)
    .gt('ends_at', starts_at)

  if (overlapping && overlapping.length > 0) {
    return NextResponse.redirect(
      new URL('/campaigns?error=' + encodeURIComponent(`Overlaps with existing campaign: "${overlapping[0].name}"`), req.url),
    )
  }

  // RLS limits this update to the campaign's vendor owner/staff.
  const { error } = await supabase
    .from('round_campaigns')
    .update({
      name,
      round_value,
      starts_at: new Date(starts_at).toISOString(),
      ends_at: new Date(ends_at).toISOString(),
      customer_message,
    })
    .eq('id', campaign_id)

  if (error) {
    return NextResponse.redirect(new URL('/campaigns?error=' + encodeURIComponent(error.message), req.url))
  }

  return NextResponse.redirect(new URL('/campaigns?success=' + encodeURIComponent('Campaign updated!'), req.url))
}
