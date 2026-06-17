import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.208.0/crypto/mod.ts'
import { encode } from 'https://deno.land/std@0.208.0/encoding/base64.ts'

const QR_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
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

    const { qr_payload } = await req.json() as { qr_payload: string }
    if (!qr_payload) return json({ error: 'qr_payload required' }, 400)

    // Decode and parse QR payload
    let parsed: { business_id: string; timestamp: number; nonce: string; hmac: string }
    try {
      parsed = JSON.parse(atob(qr_payload))
    } catch {
      return json({ error: 'Invalid QR code' }, 400)
    }

    const { business_id, timestamp, nonce, hmac } = parsed

    // Check expiry
    if (Date.now() - timestamp > QR_EXPIRY_MS) {
      return json({ error: 'QR code expired. Please ask the vendor to refresh.' }, 400)
    }

    // Fetch business to get QR secret
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, name, logo_url, qr_code_secret')
      .eq('id', business_id)
      .single()

    if (bizError || !business) return json({ error: 'Business not found' }, 404)

    // Verify HMAC
    const expectedHmac = await computeHmac(
      business.qr_code_secret,
      `${business_id}:${timestamp}:${nonce}`,
    )
    if (expectedHmac !== hmac) return json({ error: 'Invalid QR code signature' }, 400)

    // Fetch active loyalty program
    const { data: program, error: progError } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('business_id', business_id)
      .eq('is_active', true)
      .single()

    if (progError || !program) return json({ error: 'No active loyalty program for this business' }, 404)

    // Check consent — if no consent record, caller must show consent UI first
    const { data: consent } = await supabase
      .from('data_consents')
      .select('id, withdrawn_at')
      .eq('customer_id', user.id)
      .eq('business_id', business_id)
      .maybeSingle()

    if (!consent) {
      // Signal front-end to show consent modal before proceeding
      return json({
        requires_consent: true,
        business: { id: business.id, name: business.name, logo_url: business.logo_url },
      }, 200)
    }

    if (consent.withdrawn_at) {
      return json({ error: 'You have withdrawn consent for this business.' }, 403)
    }

    // Upsert loyalty card
    const stampsToAdd = 1
    const pointsToAdd = program.type === 'points' ? (program.config?.points_per_visit ?? 10) : 0

    const { data: card, error: upsertError } = await supabase
      .from('loyalty_cards')
      .upsert(
        {
          customer_id: user.id,
          program_id: program.id,
          stamps_collected: stampsToAdd,
          points_accumulated: pointsToAdd,
          last_visit: new Date().toISOString(),
        },
        {
          onConflict: 'customer_id,program_id',
          ignoreDuplicates: false,
        },
      )
      .select()
      .single()

    if (upsertError || !card) {
      // On conflict, increment existing card
      const { data: existingCard, error: fetchError } = await supabase
        .from('loyalty_cards')
        .select('*')
        .eq('customer_id', user.id)
        .eq('program_id', program.id)
        .single()

      if (fetchError || !existingCard) return json({ error: 'Failed to update card' }, 500)

      const { data: updatedCard, error: updateError } = await supabase
        .from('loyalty_cards')
        .update({
          stamps_collected: existingCard.stamps_collected + stampsToAdd,
          points_accumulated: existingCard.points_accumulated + pointsToAdd,
          last_visit: new Date().toISOString(),
        })
        .eq('id', existingCard.id)
        .select()
        .single()

      if (updateError || !updatedCard) return json({ error: 'Failed to update card' }, 500)

      await recordVisitEvent(supabase, updatedCard.id, business_id, stampsToAdd, pointsToAdd)

      const rewardUnlocked = checkRewardUnlocked(updatedCard, program)

      return json({
        card: updatedCard,
        stamps_added: stampsToAdd,
        reward_unlocked: rewardUnlocked,
        business: { id: business.id, name: business.name, logo_url: business.logo_url },
      })
    }

    await recordVisitEvent(supabase, card.id, business_id, stampsToAdd, pointsToAdd)
    const rewardUnlocked = checkRewardUnlocked(card, program)

    return json({
      card,
      stamps_added: stampsToAdd,
      reward_unlocked: rewardUnlocked,
      business: { id: business.id, name: business.name, logo_url: business.logo_url },
    })
  } catch (err) {
    console.error('stamp-card error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

async function recordVisitEvent(
  supabase: ReturnType<typeof createClient>,
  cardId: string,
  businessId: string,
  stampsAdded: number,
  pointsAdded: number,
) {
  await supabase.from('visit_events').insert({
    card_id: cardId,
    business_id: businessId,
    stamps_added: stampsAdded,
    points_added: pointsAdded,
  })
}

function checkRewardUnlocked(card: Record<string, unknown>, program: Record<string, unknown>): boolean {
  const config = program.config as Record<string, unknown>
  if (program.type === 'stamp' && typeof config?.stamps_required === 'number') {
    return (card.stamps_collected as number) >= config.stamps_required
  }
  return false
}

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
  return encode(new Uint8Array(signature))
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
