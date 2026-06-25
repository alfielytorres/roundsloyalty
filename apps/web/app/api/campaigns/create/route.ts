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
  const name = (formData.get('name') as string)?.trim()
  const round_value = parseInt(formData.get('round_value') as string)
  const starts_at = formData.get('starts_at') as string
  const ends_at = formData.get('ends_at') as string
  const customer_message = (formData.get('customer_message') as string)?.trim() || null
  const campaign_type = (formData.get('campaign_type') as string) === 'birthday' ? 'birthday' : 'standard'
  const birthday_window_days = Math.max(0, Math.min(31, parseInt(formData.get('birthday_window_days') as string) || 0))
  const notify_mode = (() => {
    const m = formData.get('notify_mode') as string
    return m === 'immediate' || m === 'none' ? m : 'on_start'
  })()

  if (!name || !starts_at || !ends_at || !round_value) {
    return NextResponse.redirect(new URL('/campaigns?error=' + encodeURIComponent('All required fields must be filled in.'), req.url))
  }

  if (new Date(ends_at) <= new Date(starts_at)) {
    return NextResponse.redirect(new URL('/campaigns?error=' + encodeURIComponent('End date must be after start date.'), req.url))
  }

  // round_value 1 = announcement only (no bonus); 2–10 = a multiplier.
  if (round_value < 1 || round_value > 10) {
    return NextResponse.redirect(new URL('/campaigns?error=' + encodeURIComponent('Round value must be between 1 and 10.'), req.url))
  }

  // Birthday campaigns are per-customer templates, so they don't conflict on a
  // shared time window — only standard campaigns get the overlap check.
  if (campaign_type === 'standard') {
    const { data: overlapping } = await supabase
      .from('round_campaigns')
      .select('id, name')
      .eq('vendor_id', vendor_id)
      .eq('status', 'scheduled')
      .eq('campaign_type', 'standard')
      .lt('starts_at', ends_at)
      .gt('ends_at', starts_at)

    if (overlapping && overlapping.length > 0) {
      return NextResponse.redirect(
        new URL('/campaigns?error=' + encodeURIComponent(`Overlaps with existing campaign: "${overlapping[0].name}"`), req.url),
      )
    }
  }

  const { data: created, error } = await supabase.from('round_campaigns').insert({
    vendor_id,
    name,
    round_value,
    starts_at: new Date(starts_at).toISOString(),
    ends_at: new Date(ends_at).toISOString(),
    customer_message,
    status: 'scheduled',
    notify_mode,
    campaign_type,
    birthday_window_days,
  }).select('id').single()

  if (error) {
    return NextResponse.redirect(new URL('/campaigns?error=' + encodeURIComponent(error.message), req.url))
  }

  // Announce now if the store chose "immediate", or if an "on_start" campaign is
  // already live the moment it's created. Future "on_start" ones are picked up
  // by process_due_campaign_notifications when their start time arrives.
  const startsNow = new Date(starts_at) <= new Date()
  if (created && campaign_type === 'standard' && (notify_mode === 'immediate' || (notify_mode === 'on_start' && startsNow))) {
    await supabase.rpc('fanout_campaign_notifications', { p_campaign_id: created.id })
  }
  // Birthday templates: immediately wish anyone already inside their window.
  if (created && campaign_type === 'birthday') {
    await supabase.rpc('process_due_birthday_notifications', { p_vendor_id: vendor_id })
  }

  return NextResponse.redirect(new URL('/campaigns?success=' + encodeURIComponent('Campaign created!'), req.url))
}
