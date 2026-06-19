import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) redirect('/')

  const cookieStore = cookies()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: { getAll: () => cookieStore.getAll() },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: staffRecord } = await supabase
    .from('vendor_staff')
    .select('vendor_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (!staffRecord) redirect('/onboarding')

  return (
    <>
      {children}
      <BottomNav />
    </>
  )
}
