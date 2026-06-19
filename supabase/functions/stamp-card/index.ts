import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const QR_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return json(null, 200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify caller JWT to get customer_id
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json() as { qr_payload?: string }
    const { qr_payload } = body
    if (!qr_payload) return json({ error: 'qr_payload required' }, 400)

    // Decode and parse QR payload
    let parsed: { business_id: string; timestamp?: number; nonce?: string; hmac?: string }
    try {
      parsed = JSON.parse(atob(qr_payload))
    } catch {
      return json({ error: 'Invalid QR code' }, 400)
    }

    const { business_id } = parsed
    if (!business_id) return json({ error: 'Invalid QR code' }, 400)

    // Fetch business to get owner
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, name, logo_url, owner_id')
      .eq('id', business_id)
      .single()

    if (bizError || !business) return json({ error: 'Business not found' }, 404)

    // Find the vendor record via owner_id (vendors schema)
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id, business_name')
      .eq('owner_id', business.owner_id)
      .limit(1)
      .single()

    if (vendorError || !vendor) return json({ error: 'Vendor not found' }, 404)

    // Find or create customer_vendor_membership
    const customerId = user.id
    let membershipToken: string

    const { data: existing } = await supabase
      .from('customer_vendor_memberships')
      .select('membership_token, status')
      .eq('customer_id', customerId)
      .eq('vendor_id', vendor.id)
      .maybeSingle()

    if (existing) {
      membershipToken = existing.membership_token
      // Auto-activate pending membership
      if (existing.status === 'pending') {
        await supabase
          .from('customer_vendor_memberships')
          .update({ status: 'active', activated_at: new Date().toISOString() })
          .eq('customer_id', customerId)
          .eq('vendor_id', vendor.id)
      }
    } else {
      // Create new membership
      const tokenBytes = new Uint8Array(32)
      crypto.getRandomValues(tokenBytes)
      const newToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')

      const { data: created, error: createErr } = await supabase
        .from('customer_vendor_memberships')
        .insert({
          customer_id: customerId,
          vendor_id: vendor.id,
          status: 'active',
          membership_token: newToken,
          activated_at: new Date().toISOString(),
        })
        .select('membership_token')
        .single()

      if (createErr || !created) {
        return json({ error: 'Failed to create membership' }, 500)
      }

      // Initialise loyalty balance
      await supabase
        .from('loyalty_balances')
        .upsert({ customer_id: customerId, vendor_id: vendor.id, stamps: 0, points: 0 })

      // Log joined + activated
      await supabase.from('loyalty_ledger').insert([
        { customer_id: customerId, vendor_id: vendor.id, event_type: 'joined', source: 'qr', staff_user_id: null },
        { customer_id: customerId, vendor_id: vendor.id, event_type: 'activated', source: 'qr', staff_user_id: null },
      ])

      membershipToken = created.membership_token
    }

    // Add stamp via RPC
    const { data: stampData, error: stampError } = await supabase.rpc('add_stamp', {
      p_membership_token: membershipToken,
      p_staff_user_id: business.owner_id,
    })

    if (stampError) {
      return json({ error: stampError.message }, 400)
    }

    const balance = stampData as { stamps: number } | null
    const stampsNow = balance?.stamps ?? 0

    return json({
      card: {
        id: customerId,
        stamps_collected: stampsNow,
      },
      stamps_added: 1,
      reward_unlocked: false,
      business: {
        id: business.id,
        name: business.name,
        logo_url: business.logo_url ?? null,
      },
    })
  } catch (err) {
    console.error('stamp-card error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

async function computeHmac(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(data === null ? null : JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders,
    },
  })
}
