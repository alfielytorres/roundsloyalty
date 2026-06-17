import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Shared per-request cache — any server component in the same render tree
// that calls this gets the same promise, so Supabase is hit exactly once.
export const getPortalData = cache(async () => {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  // Run auth + business lookup in parallel
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, description, address')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!business) redirect('/onboarding')

  return { user, business, supabase }
})
