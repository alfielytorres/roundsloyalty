import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const BATCH_SIZE = 100

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

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const { offer_id } = await req.json() as { offer_id: string }
    if (!offer_id) return json({ error: 'offer_id required' }, 400)

    // Fetch offer and verify ownership
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*, businesses!inner(owner_id)')
      .eq('id', offer_id)
      .single()

    if (offerError || !offer) return json({ error: 'Offer not found' }, 404)
    if (offer.businesses.owner_id !== user.id) return json({ error: 'Forbidden' }, 403)

    // Find target customers based on segment
    const customers = await getTargetCustomers(supabase, offer.business_id, offer.target_segment)

    if (customers.length === 0) {
      return json({ sent: 0, message: 'No customers in segment' })
    }

    // Insert offer recipients
    const recipients = customers.map((c) => ({
      offer_id,
      customer_id: c.id,
    }))

    await supabase.from('offer_recipients').upsert(recipients, {
      onConflict: 'offer_id,customer_id',
      ignoreDuplicates: true,
    })

    // Send push notifications in batches
    const pushTokens = customers
      .filter((c) => c.expo_push_token)
      .map((c) => ({
        to: c.expo_push_token!,
        title: offer.title,
        body: offer.body,
        data: { offer_id, business_id: offer.business_id },
        sound: 'default',
      }))

    let sent = 0
    for (let i = 0; i < pushTokens.length; i += BATCH_SIZE) {
      const batch = pushTokens.slice(i, i + BATCH_SIZE)
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
        })
        if (res.ok) sent += batch.length
      } catch (err) {
        console.error('Push batch failed:', err)
      }
    }

    // Mark offer as sent
    await supabase
      .from('offers')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', offer_id)

    // Mark recipients as delivered
    await supabase
      .from('offer_recipients')
      .update({ delivered_at: new Date().toISOString() })
      .eq('offer_id', offer_id)

    return json({ sent, total_customers: customers.length })
  } catch (err) {
    console.error('send-offer error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

async function getTargetCustomers(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  segment: string,
): Promise<Array<{ id: string; expo_push_token: string | null }>> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('loyalty_cards')
    .select(`
      customer_id,
      last_visit,
      profiles!inner(id, expo_push_token)
    `)
    .eq('loyalty_programs.business_id', businessId)

  // Apply segment filters
  if (segment === 'returning') {
    query = query.gte('last_visit', thirtyDaysAgo)
  } else if (segment === 'at_risk') {
    query = query.lt('last_visit', thirtyDaysAgo)
  } else if (segment === 'top') {
    query = query.gte('last_visit', thirtyDaysAgo).gte('stamps_collected', 5)
  }

  // Fallback: get all customers via vendor_customer_segments view
  const { data } = await supabase
    .from('vendor_customer_segments')
    .select('customer_id, segment')
    .eq('business_id', businessId)

  if (!data) return []

  const filtered = segment === 'all' ? data : data.filter((r) => r.segment === segment)
  const customerIds = filtered.map((r) => r.customer_id)

  if (customerIds.length === 0) return []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, expo_push_token')
    .in('id', customerIds)

  return profiles ?? []
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
