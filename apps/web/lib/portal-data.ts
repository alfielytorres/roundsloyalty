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
  card_front_text_color?: string | null; card_back_text_color?: string | null
  stamp_color?: string | null; phone?: string | null
  lat?: number | null; lng?: number | null
}

export type ProgramShape = {
  id: string; name: string; rounds_required: number; default_round_value: number
  reward_name: string; reward_description: string | null
} | null

const VENDOR_COLS = 'id, business_name, description, category, status, brand_color, join_token, address, logo_url, stamp_icon, card_background_url, stamp_bg_color, card_front_url, card_front_headline, card_front_subtext, card_back_message, card_front_text_color, card_back_text_color, stamp_color, phone, lat, lng'

// Owners/managers must finish onboarding (a program + address + phone) before
// the rest of the portal opens.
async function onboardingComplete(vendor: VendorShape, supabase: ReturnType<typeof createServerClient>) {
  if (!vendor.address || !vendor.phone) return false
  const { count } = await supabase
    .from('loyalty_programs')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', vendor.id)
    .eq('status', 'active')
  return (count ?? 0) > 0
}

// Pass { allowIncomplete: true } from the setup wizard itself so it doesn't
// redirect to itself; every other portal page leaves it off and is gated.
export const getPortalData = cache(async (opts?: { allowIncomplete?: boolean }) => {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  let vendor: VendorShape | null = null
  let role = 'owner'

  // Try staff record first (handles both owner and staff users)
  const { data: staffRecord } = await supabase
    .from('vendor_staff')
    .select(`vendor_id, role, vendors(${VENDOR_COLS})`)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (staffRecord?.vendors) {
    vendor = staffRecord.vendors as unknown as VendorShape
    role = staffRecord.role as string
  } else {
    // Fallback: user is owner but staff record missing (rare)
    const { data: ownedVendor } = await supabase
      .from('vendors')
      .select(VENDOR_COLS)
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle()
    if (!ownedVendor) redirect('/onboarding')
    vendor = ownedVendor as VendorShape
    role = 'owner'
  }

  // Onboarding lock: owners/managers can't use the portal until they've set up a
  // program, an address, and a phone. Staff are never gated.
  if (!opts?.allowIncomplete && (role === 'owner' || role === 'manager')) {
    if (!(await onboardingComplete(vendor, supabase))) redirect('/setup')
  }

  return { user, vendor, role, supabase }
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
