import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Ops feed: every vendor with a ready-to-print sign link, as CSV. Point a
// Google Sheet at it with
//   =IMPORTDATA("https://<domain>/api/ops/vendors.csv?key=<OPS_EXPORT_KEY>")
// and the sheet stays current on its own (Sheets refetches periodically), so
// the moment a vendor onboards their sign link appears — open, print, ship.
// Guarded by the OPS_EXPORT_KEY env secret; 404s when unset or wrong.
export const dynamic = 'force-dynamic'

const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

export async function GET(req: NextRequest) {
  const expected = process.env.OPS_EXPORT_KEY
  const key = req.nextUrl.searchParams.get('key')
  if (!expected || !key || key !== expected) {
    return new Response('Not found', { status: 404 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data, error } = await admin
    .from('vendors')
    .select('business_name, status, category, address, created_at, join_token')
    .order('created_at', { ascending: false })
  if (error) return new Response('Error', { status: 500 })

  const origin = req.nextUrl.origin
  const header = ['business_name', 'status', 'category', 'address', 'onboarded_at', 'print_sign_url', 'customer_join_url']
  const lines = [header.join(',')]
  for (const v of data ?? []) {
    lines.push([
      esc(v.business_name),
      esc(v.status),
      esc(v.category),
      esc(v.address),
      esc(v.created_at ? new Date(v.created_at).toISOString().slice(0, 10) : ''),
      esc(v.join_token ? `${origin}/sign/${v.join_token}` : ''),
      esc(v.join_token ? `${origin}/j/${v.join_token}` : ''),
    ].join(','))
  }

  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
