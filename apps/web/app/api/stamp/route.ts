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
  const rawToken: string = body.token?.trim()
  const action: 'stamp' | 'points' = body.action ?? 'stamp'

  if (!rawToken) return NextResponse.json({ error: 'Token is required' }, { status: 400 })

  // Resolve token: if it looks like a UUID it's a customer_id from the iOS QR code.
  // Look up (or auto-create) their membership_token for this vendor.
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  let membershipToken = rawToken

  if (uuidPattern.test(rawToken)) {
    const customerId = rawToken

    // Find existing membership
    const { data: existing } = await supabase
      .from('customer_vendor_memberships')
      .select('membership_token, status')
      .eq('customer_id', customerId)
      .eq('vendor_id', vendor.id)
      .maybeSingle()

    if (existing) {
      membershipToken = existing.membership_token
      // Auto-activate if still pending
      if (existing.status === 'pending') {
        await supabase
          .from('customer_vendor_memberships')
          .update({ status: 'active', activated_at: new Date().toISOString() })
          .eq('customer_id', customerId)
          .eq('vendor_id', vendor.id)
      }
    } else {
      // Auto-create membership for this customer+vendor
      const crypto = await import('crypto')
      const token = crypto.randomBytes(32).toString('hex')
      const { data: created, error: createErr } = await supabase
        .from('customer_vendor_memberships')
        .insert({
          customer_id: customerId,
          vendor_id: vendor.id,
          status: 'active',
          membership_token: token,
          activated_at: new Date().toISOString(),
        })
        .select('membership_token')
        .single()

      if (createErr || !created) {
        return NextResponse.json({ error: 'Failed to create membership for customer' }, { status: 500 })
      }

      // Initialise loyalty balance
      await supabase
        .from('loyalty_balances')
        .upsert({ customer_id: customerId, vendor_id: vendor.id, stamps: 0, points: 0 }, { onConflict: 'customer_id,vendor_id', ignoreDuplicates: true })

      // Ledger: joined + activated
      await supabase.from('loyalty_ledger').insert([
        { customer_id: customerId, vendor_id: vendor.id, event_type: 'joined', source: 'qr', staff_user_id: user.id },
        { customer_id: customerId, vendor_id: vendor.id, event_type: 'activated', source: 'qr', staff_user_id: user.id },
      ])

      membershipToken = created.membership_token
    }
  }

  if (action === 'stamp') {
    const { data, error } = await supabase.rpc('add_stamp', {
      p_membership_token: membershipToken,
      p_staff_user_id: user.id,
    })

    if (error) {
      const msg = error.message.includes('Rate limit')
        ? 'A stamp was already given in the last 15 minutes.'
        : error.message.includes('not active')
        ? 'This membership is not active.'
        : error.message.includes('Staff user')
        ? 'This card does not belong to your store.'
        : error.message.includes('token not found') || error.message.includes('not found')
        ? 'Customer not found. Make sure they show the correct QR code.'
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
      p_membership_token: membershipToken,
      p_staff_user_id: user.id,
      p_purchase_amount: spend_amount,  // corrected: was p_spend_amount
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
