import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Finishes the mandatory onboarding in one submit: creates/updates the loyalty
// program and saves the store's address + phone (+ coords). Once this succeeds,
// getPortalData's onboarding gate opens the rest of the portal.
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

  // Resolve vendor (owner/manager only)
  const { data: staffRecord } = await supabase
    .from('vendor_staff').select('vendor_id, role').eq('user_id', user.id).eq('status', 'active').limit(1).maybeSingle()
  let vendorId = (staffRecord?.role === 'owner' || staffRecord?.role === 'manager') ? staffRecord.vendor_id : null
  if (!vendorId) {
    const { data: owned } = await supabase.from('vendors').select('id').eq('owner_id', user.id).limit(1).maybeSingle()
    vendorId = owned?.id ?? null
  }
  if (!vendorId) return NextResponse.json({ error: 'Permission denied.' }, { status: 403 })

  const fd = await req.formData()
  const program_name = (fd.get('program_name') as string)?.trim()
  const reward_name = (fd.get('reward_name') as string)?.trim()
  const rounds_required = parseInt(fd.get('rounds_required') as string)
  const phone = (fd.get('phone') as string)?.trim()
  const address = (fd.get('address') as string)?.trim()
  const latN = parseFloat(fd.get('lat') as string)
  const lngN = parseFloat(fd.get('lng') as string)
  const lat = Number.isFinite(latN) ? latN : null
  const lng = Number.isFinite(lngN) ? lngN : null

  if (!program_name || !reward_name || !rounds_required || !phone || !address) {
    return NextResponse.json({ error: 'Program, reward, rounds, phone and address are all required.' }, { status: 400 })
  }

  // Create or update the active program.
  const { data: existing } = await supabase
    .from('loyalty_programs').select('id').eq('vendor_id', vendorId).eq('status', 'active').limit(1).maybeSingle()
  const payload = { vendor_id: vendorId, name: program_name, rounds_required, reward_name, default_round_value: 1, status: 'active' }
  const { error: progErr } = existing
    ? await supabase.from('loyalty_programs').update(payload).eq('id', existing.id)
    : await supabase.from('loyalty_programs').insert(payload)
  if (progErr) return NextResponse.json({ error: progErr.message }, { status: 400 })

  const { error: vendErr } = await supabase
    .from('vendors')
    .update({ phone, address, ...(lat != null && lng != null ? { lat, lng } : {}) })
    .eq('id', vendorId)
  if (vendErr) return NextResponse.json({ error: vendErr.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
