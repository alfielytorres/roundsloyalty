import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/is-admin'

// All stand management is ops-admin only.
async function requireAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  return isAdminEmail(user?.email) ? user : null
}

const service = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// A redirect must be empty (= default Weekends Club behaviour) or a real http(s) URL.
function cleanRedirect(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) throw new Error('Link must start with http:// or https://')
  return s.slice(0, 2000)
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  let redirect_url: string | null
  try { redirect_url = cleanRedirect(body.redirect_url) } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }) }

  const { data, error } = await service().from('qr_stands').insert({
    label: (body.label as string | undefined)?.trim() || null,
    vendor_id: (body.vendor_id as string | undefined) || null,
    redirect_url,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ stand: data })
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  let redirect_url: string | null
  try { redirect_url = cleanRedirect(body.redirect_url) } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }) }

  const { error } = await service().from('qr_stands').update({
    label: (body.label as string | undefined)?.trim() || null,
    vendor_id: (body.vendor_id as string | undefined) || null,
    redirect_url,
    updated_at: new Date().toISOString(),
  }).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await service().from('qr_stands').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
