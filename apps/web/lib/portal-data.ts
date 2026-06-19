import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const getPortalData = cache(async () => {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Find vendor via staff record
  const { data: staffRecord } = await supabase
    .from('vendor_staff')
    .select('vendor_id, role, vendors(id, business_name, description, category, status, brand_color, join_token, address, logo_url)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  type VendorShape = {
    id: string; business_name: string; description: string | null
    category: string | null; status: string; brand_color: string | null
    join_token: string | null; address: string | null; logo_url: string | null
  }

  if (staffRecord?.vendors) {
    return { user, vendor: staffRecord.vendors as unknown as VendorShape, role: staffRecord.role as string, supabase }
  }

  // Fallback: user is owner but staff record missing
  const { data: ownedVendor } = await supabase
    .from('vendors')
    .select('id, business_name, description, category, status, brand_color, join_token, address, logo_url')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!ownedVendor) redirect('/onboarding')

  return { user, vendor: ownedVendor as VendorShape, role: 'owner', supabase }
})
