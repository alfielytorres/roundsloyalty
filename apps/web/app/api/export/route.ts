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
  const vendor_id = searchParams.get('vendor_id')
  const format = searchParams.get('format') ?? 'csv'

  if (!vendor_id) return new NextResponse('Missing vendor_id', { status: 400 })

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, business_name')
    .eq('id', vendor_id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!vendor) return new NextResponse('Not found', { status: 404 })

  const { data: members } = await supabase
    .from('customer_vendor_memberships')
    .select('customer_id, status, total_visits, last_visit_at, profiles(display_name), loyalty_balances(stamps_balance, points_balance)')
    .eq('vendor_id', vendor_id)
    .order('total_visits', { ascending: false })

  if (!members) return new NextResponse('No data', { status: 404 })

  const rows = members.map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    const balance = Array.isArray(m.loyalty_balances) ? m.loyalty_balances[0] : m.loyalty_balances
    return {
      display_name: (profile as { display_name?: string | null } | null)?.display_name ?? '',
      status: m.status,
      total_visits: m.total_visits ?? 0,
      stamps_balance: (balance as { stamps_balance?: number } | null)?.stamps_balance ?? 0,
      points_balance: (balance as { points_balance?: number } | null)?.points_balance ?? 0,
      last_visit_at: m.last_visit_at ?? '',
    }
  })

  const filename = vendor.business_name.replace(/\s+/g, '-').toLowerCase()

  if (format === 'json') {
    return new NextResponse(JSON.stringify(rows, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}-customers.json"`,
      },
    })
  }

  const headers = ['display_name', 'status', 'total_visits', 'stamps_balance', 'points_balance', 'last_visit_at']
  const csvRows = rows.map((r) =>
    headers.map((h) => JSON.stringify((r as Record<string, unknown>)[h] ?? '')).join(','),
  )
  const csv = [headers.join(','), ...csvRows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}-customers.csv"`,
    },
  })
}
