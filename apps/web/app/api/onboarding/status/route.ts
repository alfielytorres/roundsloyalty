import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Lightweight check the portal nav uses to hide itself while an owner/manager
// still has onboarding to finish (program + address + phone).
export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ gated: false })

  const { data: staff } = await supabase
    .from('vendor_staff').select('role, vendors(id, address, phone)').eq('user_id', user.id).eq('status', 'active').limit(1).maybeSingle()

  let vendor = (staff?.vendors as unknown as { id: string; address: string | null; phone: string | null } | null) ?? null
  let role = staff?.role as string | undefined
  if (!vendor) {
    const { data: owned } = await supabase.from('vendors').select('id, address, phone').eq('owner_id', user.id).limit(1).maybeSingle()
    vendor = owned as typeof vendor
    role = 'owner'
  }

  if (!vendor || (role !== 'owner' && role !== 'manager')) return NextResponse.json({ gated: false })

  let complete = !!vendor.address && !!vendor.phone
  if (complete) {
    const { count } = await supabase
      .from('loyalty_programs').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id).eq('status', 'active')
    complete = (count ?? 0) > 0
  }

  return NextResponse.json({ gated: !complete })
}
