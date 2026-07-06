import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { isAdminEmail } from '@/lib/is-admin'
import OpsNav from '../OpsNav'
import OpsCards, { CardData } from './OpsCards'

// Admin-only: a gallery of every vendor's loyalty card so ops can flip and
// export the front/back for reels. Same gating as the rest of /ops.
export const dynamic = 'force-dynamic'

export default async function OpsCardsPage() {
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/')
  if (!isAdminEmail(user.email)) notFound()

  // Admin verified — read across all vendors with the service role.
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: vendorRows } = await db
    .from('vendors')
    .select('id, business_name, brand_color, logo_url, stamp_icon, card_background_url, stamp_bg_color, card_front_url, card_front_headline, card_front_subtext, card_back_message, card_front_text_color, card_back_text_color, stamp_color, created_at')
    .order('created_at', { ascending: false })

  const { data: programRows } = await db
    .from('loyalty_programs')
    .select('vendor_id, reward_name, rounds_required')
    .eq('status', 'active')

  const programByVendor = new Map((programRows ?? []).map((p) => [p.vendor_id, p]))
  const vendors: CardData[] = (vendorRows ?? []).map((v) => {
    const p = programByVendor.get(v.id)
    return {
      id: v.id,
      vendorName: v.business_name ?? 'Store',
      logoUrl: v.logo_url ?? '',
      brandHex: v.brand_color ?? '#1D1D1F',
      stampBgHex: v.stamp_bg_color ?? '',
      cardBgUrl: v.card_background_url ?? '',
      icon: v.stamp_icon ?? '☕',
      rounds: p?.rounds_required ?? 10,
      rewardName: p?.reward_name ?? '',
      frontUrl: v.card_front_url ?? '',
      frontHeadline: v.card_front_headline ?? '',
      frontSubtext: v.card_front_subtext ?? '',
      backMessage: v.card_back_message ?? '',
      frontTextColor: v.card_front_text_color ?? '',
      backTextColor: v.card_back_text_color ?? '',
      stampColor: v.stamp_color ?? '',
    }
  })

  return (
    <main className="px-5 py-10 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <OpsNav />
        <div className="mb-7">
          <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-0.5">Rounds · Ops</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Loyalty cards</h1>
          <p className="text-black/40 text-sm mt-0.5">
            {vendors.length} store{vendors.length === 1 ? '' : 's'} — flip any card and export the front or back for socials.
          </p>
        </div>
        <OpsCards vendors={vendors} />
      </div>
    </main>
  )
}
