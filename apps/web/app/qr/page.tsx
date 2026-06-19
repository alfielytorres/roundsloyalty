import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import QRDisplay from './QRDisplay'

export default async function QRPage() {
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
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!business) {
    return (
      <main className="px-6 pt-10 pb-32">
        <div className="max-w-2xl mx-auto text-center py-20">
          <p className="text-[#9CA3AF] text-sm">
            Set up your business in Settings before generating a QR code.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-[#9CA3AF] text-xs font-semibold tracking-widest uppercase mb-1">
            {business.name}
          </p>
          <h1 className="text-3xl font-extrabold text-[#111111]">My QR Code</h1>
        </div>
        <QRDisplay />
      </div>
    </main>
  )
}
