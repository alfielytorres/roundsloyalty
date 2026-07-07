import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Hands the browser a short-lived signed URL so it can upload the image straight
// to Supabase Storage — bypassing the serverless request-body cap (~4.5 MB) that
// made full-size phone photos fail when they went through the server.
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve vendor (owner/manager, else owned)
  const { data: staffRecord } = await supabase
    .from('vendor_staff').select('vendor_id, role').eq('user_id', user.id).eq('status', 'active').limit(1).maybeSingle()
  let vendorId = (staffRecord?.role === 'owner' || staffRecord?.role === 'manager') ? staffRecord.vendor_id : null
  if (!vendorId) {
    const { data: owned } = await supabase.from('vendors').select('id').eq('owner_id', user.id).limit(1).maybeSingle()
    vendorId = owned?.id ?? null
  }
  if (!vendorId) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

  const body = await req.json().catch(() => null) as { prefix?: string; ext?: string } | null
  const prefix = (body?.prefix || 'logo').replace(/[^a-z0-9-]/gi, '') || 'logo'
  const ext = (body?.ext || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5).toLowerCase() || 'jpg'
  const path = `${vendorId}/${prefix}-${Date.now()}.${ext}`

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await admin.storage.from('vendor-logos').createSignedUploadUrl(path)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data: pub } = admin.storage.from('vendor-logos').getPublicUrl(path)

  return NextResponse.json({ path, token: data.token, publicUrl: pub.publicUrl })
}
