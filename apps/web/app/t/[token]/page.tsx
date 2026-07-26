import { redirect, notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Public resolver for a QR/NFC stand. The printed code always points here; the
// ops admin decides where "here" goes:
//   * redirect_url set  -> straight to that URL (anywhere the admin wants)
//   * otherwise         -> the assigned store's Weekends Club landing (get the app /
//                          join), i.e. the default loyalty behaviour.
export const dynamic = 'force-dynamic'

export default async function StandRedirect({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: stand } = await db
    .from('qr_stands')
    .select('redirect_url, vendor_id')
    .eq('token', token)
    .maybeSingle()
  if (!stand) notFound()

  // A configured link wins.
  const custom = (stand.redirect_url ?? '').trim()
  if (/^https?:\/\//i.test(custom)) redirect(custom)

  // Default: the assigned store's join/get-the-app landing.
  if (stand.vendor_id) {
    const { data: v } = await db.from('vendors').select('join_token').eq('id', stand.vendor_id).maybeSingle()
    if (v?.join_token) redirect(`/j/${v.join_token}`)
  }

  // Unassigned stand → generic Weekends Club home.
  redirect('/')
}
