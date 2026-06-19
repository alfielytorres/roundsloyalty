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

  // Find vendor where user is owner or active staff member
  const { data: staffRecord } = await supabase
    .from('vendor_staff')
    .select('vendor_id, role, vendors(id, business_name, description, category, status, brand_color, join_token, address, logo_url)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!staffRecord) redirect('/onboarding')

  const vendor = staffRecord.vendors as unknown as {
    id: string
    business_name: string
    description: string | null
    category: string | null
    status: string
    brand_color: string | null
    join_token: string | null
    address: string | null
    logo_url: string | null
  }

  if (!vendor) redirect('/onboarding')

  return { user, vendor, role: staffRecord.role as string, supabase }
})
