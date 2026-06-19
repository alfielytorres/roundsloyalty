import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const customerToken: string = body.customer_token?.trim()
  const vendorId: string = body.vendor_id

  if (!customerToken || !vendorId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  // Look up profile by customer_token
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('customer_token', customerToken)
    .maybeSingle()

  if (!profile) return NextResponse.json({ customer: null })

  // Get their membership for this vendor
  const { data: membership } = await supabase
    .from('customer_vendor_memberships')
    .select('current_rounds')
    .eq('customer_id', profile.id)
    .eq('vendor_id', vendorId)
    .maybeSingle()

  // Get the program
  const { data: program } = await supabase
    .from('loyalty_programs')
    .select('rounds_required, reward_name')
    .eq('vendor_id', vendorId)
    .eq('status', 'active')
    .maybeSingle()

  return NextResponse.json({
    customer: {
      display_name: profile.display_name ?? 'Customer',
      current_rounds: membership?.current_rounds ?? 0,
      rounds_required: program?.rounds_required ?? 10,
      reward_name: program?.reward_name ?? 'Reward',
    },
  })
}
