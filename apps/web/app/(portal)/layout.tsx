import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Stamp, Users, Send, Settings2 } from 'lucide-react'

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

  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!business) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <nav className="bg-cream/80 backdrop-blur-md border-b border-[#7DB542]/[.15] px-8 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="font-extrabold text-primary-dark text-lg">
            {business.name}
          </Link>
          <div className="flex items-center gap-1">
            <NavLink href="/stamp" icon={<Stamp size={15} />}>Stamp</NavLink>
            <NavLink href="/customers" icon={<Users size={15} />}>Customers</NavLink>
            <NavLink href="/offers" icon={<Send size={15} />}>Offers</NavLink>
          </div>
        </div>
        <NavLink href="/settings" icon={<Settings2 size={15} />}>Settings</NavLink>
      </nav>
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}

function NavLink({ href, icon, children }: { href: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-taupe hover:text-primary-dark hover:bg-cream transition-colors"
    >
      {icon}
      {children}
    </Link>
  )
}
