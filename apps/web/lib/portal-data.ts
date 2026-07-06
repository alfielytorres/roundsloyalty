import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

type VendorShape = {
  id: string; business_name: string; description: string | null
  category: string | null; status: string; brand_color: string | null
  join_token: string | null; address: string | null; logo_url: string | null
  stamp_icon: string | null; card_background_url: string | null
  stamp_bg_color: string | null
  card_front_url?: string | null; card_front_headline?: string | null
  card_front_subtext?: string | null; card_back_message?: string | null
  lat?: number | null; lng?: number | null
}

export type ProgramShape = {
  id: string; name: string; rounds_required: number; default_round_value: number
  reward_name: string; reward_description: string | null
} | null

export const getPortalData = cache(async () => {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Try staff record first (handles both owner and staff users)
  const { data: staffRecord } = await supabase
    .from('vendor_staff')
    .select('vendor_id, role, vendors(id, business_name, description, category, status, brand_color, join_token, address, logo_url, stamp_icon, card_background_url, stamp_bg_color, card_front_url, card_front_headline, card_front_subtext, card_back_message)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (staffRecord?.vendors) {
    const vendor = staffRecord.vendors as unknown as VendorShape
    return { user, vendor, role: staffRecord.role as string, supabase }
  }

  // Fallback: user is owner but staff record missing (rare)
  const { data: ownedVendor } = await supabase
    .from('vendors')
    .select('id, business_name, description, category, status, brand_color, join_token, address, logo_url, stamp_icon, card_background_url, stamp_bg_color, card_front_url, card_front_headline, card_front_subtext, card_back_message, lat, lng')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!ownedVendor) redirect('/onboarding')
  return { user, vendor: ownedVendor as VendorShape, role: 'owner', supabase }
})

export async function fetchProgram(vendorId: string, supabase: ReturnType<typeof createServerClient>) {
  const { data } = await supabase
    .from('loyalty_programs')
    .select('id, name, rounds_required, default_round_value, reward_name, reward_description')
    .eq('vendor_id', vendorId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  return data as ProgramShape
}
