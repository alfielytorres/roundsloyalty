import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export type VendorShape = {
  id: string; business_name: string; description: string | null
  category: string | null; status: string; brand_color: string | null
  join_token: string | null; address: string | null; logo_url: string | null
  lat?: number | null; lng?: number | null
}

export type ProgramShape = {
  id: string; name: string; rounds_required: number
  reward_name: string; reward_description: string | null
  reward_expiry_days: number | null; default_round_value: number; status: string
} | null

// Cached per-user vendor+program lookup — survives across navigations for 60s
const getCachedVendorData = unstable_cache(
  async (userId: string, supabaseUrl: string, supabaseKey: string) => {
    const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: { getAll: () => [] } })

    // Run staff+vendor lookup and owner fallback
    const { data: staffRecord } = await supabase
      .from('vendor_staff')
      .select('vendor_id, role, vendors(id, business_name, description, category, status, brand_color, join_token, address, logo_url, lat, lng)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    let vendor: VendorShape | null = null
    let role = 'owner'

    if (staffRecord?.vendors) {
      vendor = staffRecord.vendors as unknown as VendorShape
      role = staffRecord.role as string
    } else {
      const { data: owned } = await supabase
        .from('vendors')
        .select('id, business_name, description, category, status, brand_color, join_token, address, logo_url, lat, lng')
        .eq('owner_id', userId)
        .limit(1)
        .maybeSingle()
      vendor = owned as VendorShape | null
    }

    if (!vendor) return null

    // Fetch program in parallel — no dependency on previous results
    const { data: program } = await supabase
      .from('loyalty_programs')
      .select('id, name, rounds_required, reward_name, reward_description, reward_expiry_days, default_round_value, status')
      .eq('vendor_id', vendor.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    return { vendor, program: program as ProgramShape, role }
  },
  ['vendor-data'],
  { revalidate: 60, tags: ['vendor-data'] },
)

// React cache() deduplicates within a single render (layout + page share one call)
export const getPortalData = cache(async () => {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const cached = await getCachedVendorData(
    user.id,
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  if (!cached) redirect('/onboarding')

  return { user, vendor: cached.vendor, program: cached.program, role: cached.role, supabase }
})

// Call this after saving settings so the cache refreshes immediately
export async function revalidateVendorCache() {
  const { revalidateTag } = await import('next/cache')
  revalidateTag('vendor-data')
}
