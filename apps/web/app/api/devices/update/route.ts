import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const device_id = formData.get('device_id') as string
  const name = (formData.get('name') as string)?.trim()
  const location_label = (formData.get('location_label') as string)?.trim() || null
  const location_id = (formData.get('location_id') as string) || null

  if (!device_id || !name) {
    return NextResponse.json({ error: 'Device id and name are required.' }, { status: 400 })
  }

  // RLS limits this update to the device's vendor owner/staff.
  const { error } = await supabase
    .from('nfc_stamp_devices')
    .update({ name, location_label, location_id })
    .eq('id', device_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
