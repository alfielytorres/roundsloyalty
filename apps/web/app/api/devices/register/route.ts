import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

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
  if (!user) return NextResponse.redirect(new URL('/', req.url))

  const formData = await req.formData()
  const vendor_id = formData.get('vendor_id') as string
  const name = (formData.get('name') as string)?.trim()
  const location_label = (formData.get('location_label') as string)?.trim() || null
  const device_token_raw = (formData.get('device_token') as string)?.trim()

  if (!name || !device_token_raw) {
    return NextResponse.redirect(new URL('/devices?error=' + encodeURIComponent('Name and device token are required.'), req.url))
  }

  // Hash the device token before storing
  const device_token_hash = createHash('sha256').update(device_token_raw).digest('hex')

  const { error } = await supabase.from('nfc_stamp_devices').insert({
    vendor_id,
    name,
    location_label,
    device_token_hash,
    status: 'active',
  })

  if (error) {
    return NextResponse.redirect(new URL('/devices?error=' + encodeURIComponent(error.message), req.url))
  }

  return NextResponse.redirect(new URL('/devices?success=' + encodeURIComponent('Device registered!'), req.url))
}
