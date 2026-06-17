import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const business_id = searchParams.get('business_id')
  const format = searchParams.get('format') ?? 'csv'

  if (!business_id) return new NextResponse('Missing business_id', { status: 400 })

  // Verify ownership
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('id', business_id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!business) return new NextResponse('Not found', { status: 404 })

  const { data: customers } = await supabase
    .from('vendor_customer_segments')
    .select('*')
    .eq('business_id', business_id)
    .order('total_visits', { ascending: false })

  if (!customers) return new NextResponse('No data', { status: 404 })

  if (format === 'json') {
    return new NextResponse(JSON.stringify(customers, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${business.name}-customers.json"`,
      },
    })
  }

  // CSV
  const headers = ['display_name', 'segment', 'total_visits', 'stamps_collected', 'last_visit']
  const rows = customers.map((c) =>
    headers.map((h) => JSON.stringify((c as Record<string, unknown>)[h] ?? '')).join(','),
  )
  const csv = [headers.join(','), ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${business.name}-customers.csv"`,
    },
  })
}
