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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const body = await req.json()
  const card_code: string = body.card_code?.trim()
  const stamps: number = Math.max(1, Math.min(10, parseInt(body.stamps) || 1))

  if (!card_code) return NextResponse.json({ error: 'Card code is required' }, { status: 400 })

  // Look up the loyalty card by its code (UUID or short code)
  const { data: card } = await supabase
    .from('loyalty_cards')
    .select('id, customer_id, stamps_collected, program_id, profiles(display_name), loyalty_programs(business_id, stamps_required:config->stamps_required)')
    .eq('id', card_code)
    .maybeSingle()

  if (!card) {
    return NextResponse.json({ error: 'Card not found. Make sure the customer shows their card code from the Rounds app.' }, { status: 404 })
  }

  // Verify the card belongs to a program for this business
  const program = card.loyalty_programs as { business_id: string } | null
  if (!program || program.business_id !== business.id) {
    return NextResponse.json({ error: 'This card is not for your business.' }, { status: 403 })
  }

  const newTotal = (card.stamps_collected ?? 0) + stamps

  // Update stamp count
  const { error: updateError } = await supabase
    .from('loyalty_cards')
    .update({ stamps_collected: newTotal, last_visit: new Date().toISOString() })
    .eq('id', card.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Log the visit event
  await supabase.from('visit_events').insert({
    card_id: card.id,
    business_id: business.id,
    stamps_added: stamps,
    points_added: 0,
  })

  const profile = card.profiles as { display_name: string } | null
  return NextResponse.json({
    success: true,
    customer_name: profile?.display_name ?? 'Customer',
    new_total: newTotal,
  })
}
