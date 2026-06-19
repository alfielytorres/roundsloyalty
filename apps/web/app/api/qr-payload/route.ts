import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function computeHmac(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Buffer.from(sig).toString('base64')
}

export async function GET() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, qr_code_secret')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!business?.qr_code_secret) {
    return NextResponse.json({ error: 'Business not found or QR secret not configured' }, { status: 404 })
  }

  const timestamp = Date.now()
  const nonce = crypto.randomUUID()
  const message = `${business.id}:${timestamp}:${nonce}`
  const hmac = await computeHmac(business.qr_code_secret, message)

  const payload = Buffer.from(
    JSON.stringify({ business_id: business.id, timestamp, nonce, hmac }),
  ).toString('base64')

  return NextResponse.json({
    payload,
    businessName: business.name,
    expiresAt: timestamp + 5 * 60 * 1000,
  })
}
