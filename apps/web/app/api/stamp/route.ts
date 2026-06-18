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

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, business_name')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!vendor) return NextResponse.json({ error: 'Vendor account not found' }, { status: 404 })

  const body = await req.json()
  const token: string = body.token?.trim()
  const action: 'stamp' | 'points' = body.action ?? 'stamp'

  if (!token) return NextResponse.json({ error: 'Token is required' }, { status: 400 })

  if (action === 'stamp') {
    const { data, error } = await supabase.rpc('add_stamp', {
      p_membership_token: token,
      p_staff_user_id: user.id,
    })

    if (error) {
      const msg = error.message.includes('Rate limit')
        ? 'A stamp was already given in the last 15 minutes.'
        : error.message.includes('not active')
        ? 'This membership is not active yet. Ask the customer to activate it in the Rounds app.'
        : error.message.includes('Staff user')
        ? 'This card does not belong to your store.'
        : error.message.includes('token not found')
        ? 'Token not found. Make sure the customer shows the correct QR code.'
        : error.message
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const balance = data as { stamps: number } | null
    return NextResponse.json({
      success: true,
      message: `Stamp added! Customer now has ${balance?.stamps ?? '?'} stamp${(balance?.stamps ?? 0) !== 1 ? 's' : ''}.`,
    })
  }

  if (action === 'points') {
    const spend_amount: number = parseFloat(body.amount) || 0
    if (spend_amount <= 0) return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })

    const { data, error } = await supabase.rpc('add_points_from_spend', {
      p_membership_token: token,
      p_staff_user_id: user.id,
      p_spend_amount: spend_amount,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const balance = data as { points: number } | null
    return NextResponse.json({
      success: true,
      message: `Points added! Customer now has ${balance?.points ?? '?'} points.`,
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
