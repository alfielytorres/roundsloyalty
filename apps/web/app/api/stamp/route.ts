import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
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
  // Service role client for the award RPC (bypasses auth.uid() check in DB;
  // staff/owner validation is already done above in application code).
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Try vendor_staff first, then fall back to owner lookup
  const { data: staffRecord } = await supabase
    .from('vendor_staff')
    .select('vendor_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  let vendorId: string | null = staffRecord?.vendor_id ?? null

  if (!vendorId) {
    const { data: owned } = await supabase
      .from('vendors')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle()
    vendorId = owned?.id ?? null
  }

  if (!vendorId) return NextResponse.json({ error: 'Vendor account not found' }, { status: 404 })

  const body = await req.json()
  const customerToken: string = body.customer_token?.trim()
  const source: string = body.source ?? 'staff_scan'
  const idempotencyKey: string = body.idempotency_key || crypto.randomUUID()

  if (!customerToken) return NextResponse.json({ error: 'customer_token is required' }, { status: 400 })

  const { data, error } = await adminSupabase.rpc('award_rounds', {
    p_customer_token: customerToken,
    p_vendor_id: vendorId,
    p_source: 'server_stamp',
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
    campaign_name: string | null
    rewards_unlocked: number
    balance: {
      current_rounds: number
      lifetime_rounds: number
    }
    vendor: {
      id: string
      business_name: string
      brand_color: string
    }
  } | null

  const rewardsUnlocked = result?.rewards_unlocked ?? 0
  return NextResponse.json({
    success: true,
    rounds_awarded: result?.rounds_awarded ?? 1,
    new_balance: result?.balance.current_rounds ?? 0,
    campaign_name: result?.campaign_name ?? null,
    reward_unlocked: rewardsUnlocked > 0,
    rewards_unlocked: rewardsUnlocked,
    message: `${result?.rounds_awarded ?? 1} round${(result?.rounds_awarded ?? 1) !== 1 ? 's' : ''} awarded!${rewardsUnlocked > 0 ? ` ${rewardsUnlocked} reward${rewardsUnlocked === 1 ? '' : 's'} unlocked!` : ''}`,
  })
}
