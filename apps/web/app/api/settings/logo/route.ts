import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve vendor id
  const { data: staffRecord } = await supabase
    .from('vendor_staff')
    .select('vendor_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  let vendorId = staffRecord?.vendor_id
  if (!vendorId) {
    const { data: owned } = await supabase.from('vendors').select('id').eq('owner_id', user.id).limit(1).maybeSingle()
    vendorId = owned?.id
  }
  if (!vendorId) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Same endpoint handles logos and card backgrounds; prefix keeps paths tidy.
  const prefix = ((formData.get('prefix') as string) || 'logo').replace(/[^a-z0-9-]/gi, '') || 'logo'
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${vendorId}/${prefix}-${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  // Use service role to bypass storage RLS for upload
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error: uploadError } = await admin.storage
    .from('vendor-logos')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('vendor-logos').getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
