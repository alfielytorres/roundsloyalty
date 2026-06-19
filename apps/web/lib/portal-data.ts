import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const getPortalData = cache(async () => {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: vendor, error } = await supabase
    .from('vendors')
    .select('id, business_name, description, category, status, proof_of_purchase_enabled, proof_of_purchase_instructions, proof_of_purchase_max_claim_age_days, brand_color')
    .eq('owner_id', user.id)
    .limit(1)
    .single()

  if (error || !vendor) redirect('/onboarding')

  return { user, vendor, supabase }
})
