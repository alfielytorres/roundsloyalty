import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import NavBar from './NavBar'

const getPortalData = cache(async () => {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!business) redirect('/onboarding')

  return { user, business }
})

export default async function PortalShell({ children }: { children: React.ReactNode }) {
  const { business } = await getPortalData()

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <NavBar businessName={business.name} />
      <div className="flex-1">{children}</div>
    </div>
  )
}
