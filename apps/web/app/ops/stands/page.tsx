import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { isAdminEmail } from '@/lib/is-admin'
import OpsNav from '../OpsNav'
import StandsClient, { Stand, VendorOption } from './StandsClient'

// Admin-only. Manage the physical QR/NFC stands and where each one points.
export const dynamic = 'force-dynamic'

export default async function StandsPage() {
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/')
  if (!isAdminEmail(user.email)) notFound()

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const [{ data: stands }, { data: vendors }] = await Promise.all([
    db.from('qr_stands').select('id, token, label, vendor_id, redirect_url, created_at').order('created_at', { ascending: false }),
    db.from('vendors').select('id, business_name').order('business_name'),
  ])

  return (
    <main className="px-5 py-10 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <OpsNav />
        <div className="mb-7">
          <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-0.5">Weekends Club · Ops</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">QR stands</h1>
          <p className="text-black/40 text-sm mt-0.5">
            Each stand&apos;s code points at Weekends Club. Leave it default to send people to the store&apos;s join page, or set a link to send them anywhere.
          </p>
        </div>
        <StandsClient
          initialStands={(stands ?? []) as Stand[]}
          vendors={(vendors ?? []) as VendorOption[]}
        />
      </div>
    </main>
  )
}
