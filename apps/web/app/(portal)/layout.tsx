import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) redirect('/')

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: { getAll: () => cookieStore.getAll() },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: staffRecord } = await supabase
    .from('vendor_staff')
    .select('vendor_id, status')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!staffRecord) {
    // Fallback: check if user is a vendor owner (staff record may have failed to insert)
    const { data: ownedVendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle()

    if (!ownedVendor) redirect('/onboarding')

    // Auto-repair missing staff record
    await supabase.from('vendor_staff').upsert(
      { vendor_id: ownedVendor.id, user_id: user.id, role: 'owner', status: 'active' },
      { onConflict: 'vendor_id,user_id' }
    )
  }

  return (
    <>
      {children}
      <BottomNav />
    </>
  )
}
