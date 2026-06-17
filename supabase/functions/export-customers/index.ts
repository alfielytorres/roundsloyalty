import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const url = new URL(req.url)
    const businessId = url.searchParams.get('business_id')
    const format = url.searchParams.get('format') ?? 'csv'

    if (!businessId) return json({ error: 'business_id required' }, 400)

    // Verify ownership
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', businessId)
      .eq('owner_id', user.id)
      .single()

    if (!business) return json({ error: 'Business not found or access denied' }, 404)

    // Fetch all customer data for this business
    const { data: rows } = await supabase
      .from('vendor_customer_segments')
      .select('*')
      .eq('business_id', businessId)

    if (!rows) return json({ error: 'Failed to fetch data' }, 500)

    // Fetch consent status for each customer
    const customerIds = rows.map((r) => r.customer_id)
    const { data: consents } = await supabase
      .from('data_consents')
      .select('customer_id, consented_at, withdrawn_at')
      .eq('business_id', businessId)
      .in('customer_id', customerIds)

    const consentMap = new Map((consents ?? []).map((c) => [c.customer_id, c]))

    const exportRows = rows.map((r) => {
      const consent = consentMap.get(r.customer_id)
      return {
        customer_id: r.customer_id,
        display_name: r.display_name ?? 'Anonymous',
        total_visits: r.total_visits,
        stamps_collected: r.stamps_collected,
        points_accumulated: r.points_accumulated,
        tier: r.tier ?? '',
        last_visit: r.last_visit ?? '',
        first_visit: r.first_visit,
        segment: r.segment,
        consent_given: consent ? new Date(consent.consented_at).toISOString() : '',
        consent_withdrawn: consent?.withdrawn_at ? new Date(consent.withdrawn_at).toISOString() : '',
      }
    })

    if (format === 'json') {
      return new Response(JSON.stringify(exportRows, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${business.name}-customers.json"`,
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // CSV format
    const headers = Object.keys(exportRows[0] ?? {})
    const csvLines = [
      headers.join(','),
      ...exportRows.map((row) =>
        headers.map((h) => {
          const val = String(row[h as keyof typeof row] ?? '')
          return val.includes(',') ? `"${val}"` : val
        }).join(',')
      ),
    ]
    const csv = csvLines.join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${business.name}-customers.csv"`,
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    console.error('export-customers error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
