import { createClient } from '@supabase/supabase-js'

export interface PublicVendor {
  id: string
  business_name: string
  brand_color: string | null
  logo_url: string | null
  stamp_icon: string | null
  category: string | null
  join_token: string
  reward_name: string | null
  rounds_required: number | null
}

// Resolve the public-safe vendor info behind a join token. Uses the service
// role because vendors RLS doesn't allow anonymous reads; the join token is the
// capability (same secret the store QR already exposes).
export async function vendorByJoinToken(token: string): Promise<PublicVendor | null> {
  if (!token || token.length < 8) return null
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: vendor } = await admin
    .from('vendors')
    .select('id, business_name, brand_color, logo_url, stamp_icon, category, join_token')
    .eq('join_token', token)
    .eq('status', 'active')
    .maybeSingle()
  if (!vendor) return null

  const { data: program } = await admin
    .from('loyalty_programs')
    .select('reward_name, rounds_required')
    .eq('vendor_id', vendor.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  return {
    ...vendor,
    reward_name: program?.reward_name ?? null,
    rounds_required: program?.rounds_required ?? null,
  } as PublicVendor
}

// The exact payload the iOS in-app scanner sends to award_rounds(qr_payload).
export function joinQrPayload(joinToken: string): string {
  return Buffer.from(JSON.stringify({ join_token: joinToken })).toString('base64')
}
