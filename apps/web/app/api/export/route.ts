import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
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

  // Access check: vendor owner OR active staff.
  const { data: ownVendor } = await supabase
    .from('vendors').select('id, business_name').eq('id', vendor_id).eq('owner_id', user.id).maybeSingle()

  let vendor = ownVendor
  if (!vendor) {
    const { data: staff } = await supabase
      .from('vendor_staff').select('id').eq('vendor_id', vendor_id).eq('user_id', user.id).eq('status', 'active').maybeSingle()
    if (staff) {
      const { data: v } = await supabase.from('vendors').select('id, business_name').eq('id', vendor_id).maybeSingle()
      vendor = v ?? null
    }
  }
  if (!vendor) return new NextResponse('Not found', { status: 404 })

  const { data: members, error } = await supabase
    .from('customer_vendor_memberships')
    .select('customer_id, status, current_rounds, lifetime_rounds, activated_at, created_at, profiles(display_name)')
    .eq('vendor_id', vendor_id)
    .order('lifetime_rounds', { ascending: false })

  if (error) return new NextResponse(`Export failed: ${error.message}`, { status: 500 })

  const rows = (members ?? []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return {
      display_name: (profile as { display_name?: string | null } | null)?.display_name ?? '',
      status: m.status ?? '',
      current_rounds: m.current_rounds ?? 0,
      lifetime_rounds: m.lifetime_rounds ?? 0,
      joined_at: m.activated_at ?? m.created_at ?? '',
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

  const headers = ['display_name', 'status', 'current_rounds', 'lifetime_rounds', 'joined_at']
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
