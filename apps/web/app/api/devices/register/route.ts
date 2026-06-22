import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'

// Base URL written to the physical tag. The app extracts the token from the
// last path segment, so the host is cosmetic for the in-app tap flow, but it
// should point at the live deployment so a tap without the app still resolves.
// Override via NEXT_PUBLIC_NFC_TAG_BASE_URL when the custom domain goes live.
const TAG_BASE_URL = process.env.NEXT_PUBLIC_NFC_TAG_BASE_URL ?? 'https://roundsloyalty.vercel.app/s'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: object }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const vendor_id = body?.vendor_id as string | undefined
  const name = (body?.name as string | undefined)?.trim()
  const location_label = (body?.location_label as string | undefined)?.trim() || null

  if (!vendor_id || !name) {
    return NextResponse.json({ error: 'Vendor and device name are required.' }, { status: 400 })
  }

  // Generate the device token server-side; only its SHA-256 hash is ever stored.
  const device_token = randomBytes(16).toString('hex')
  const device_token_hash = createHash('sha256').update(device_token).digest('hex')

  const { error } = await supabase.from('nfc_stamp_devices').insert({
    vendor_id,
    name,
    location_label,
    device_token_hash,
    status: 'active',
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Returned once for the merchant to write to the tag — the plaintext token is never persisted.
  return NextResponse.json({ token: device_token, tag_url: `${TAG_BASE_URL}/${device_token}` })
}
