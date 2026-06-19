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

  // Resolve vendor via vendor_staff
  const { data: staffRecord } = await supabase
    .from('vendor_staff')
    .select('vendor_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (!staffRecord) return NextResponse.json({ error: 'Vendor account not found' }, { status: 404 })

  const vendorId = staffRecord.vendor_id

  const body = await req.json()
  const customerToken: string = body.customer_token?.trim()
  const source: string = body.source ?? 'staff_scan'
  const idempotencyKey: string = body.idempotency_key || crypto.randomUUID()

  if (!customerToken) return NextResponse.json({ error: 'customer_token is required' }, { status: 400 })

  const { data, error } = await supabase.rpc('award_rounds', {
    p_customer_token: customerToken,
    p_vendor_id: vendorId,
    p_source: source,
    p_staff_user_id: user.id,
    p_idempotency_key: idempotencyKey,
  })

  if (error) {
    const msg = error.message.includes('Rate limit') || error.message.includes('rate_limit')
      ? 'A round was already awarded in the last few minutes.'
      : error.message.includes('not active') || error.message.includes('inactive')
      ? 'This membership is not active.'
      : error.message.includes('not found') || error.message.includes('token')
      ? 'Customer not found. Make sure they show the correct QR code.'
      : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const result = data as {
    rounds_awarded: number
    new_balance: number
    campaign_name: string | null
    reward_unlocked: boolean
    reward_name: string | null
  } | null

  return NextResponse.json({
    success: true,
    rounds_awarded: result?.rounds_awarded ?? 1,
    new_balance: result?.new_balance ?? 0,
    campaign_name: result?.campaign_name ?? null,
    reward_unlocked: result?.reward_unlocked ?? false,
    reward_name: result?.reward_name ?? null,
    message: `${result?.rounds_awarded ?? 1} round${(result?.rounds_awarded ?? 1) !== 1 ? 's' : ''} awarded!${result?.reward_unlocked ? ` Reward unlocked: ${result.reward_name}!` : ''}`,
  })
}
