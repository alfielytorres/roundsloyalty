import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import { Award } from 'lucide-react'
import ProgramEditor from './ProgramEditor'

interface VendorData {
  id: string
  business_name: string
  logo_url: string | null
  brand_color: string | null
  stamp_icon: string | null
  card_background_url: string | null
  stamp_bg_color: string | null
  card_front_url?: string | null
  card_front_headline?: string | null
  card_front_subtext?: string | null
  card_back_message?: string | null
  card_front_text_color?: string | null
  card_back_text_color?: string | null
  stamp_color?: string | null
}

interface ProgramRow {
  id: string
  name: string
  rounds_required: number
  reward_name: string
  reward_description: string | null
  reward_expiry_days: number | null
  default_round_value: number
}

async function ProgramView({ vendorId, vendorData, role }: { vendorId: string; vendorData: VendorData; role: string }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: program } = await supabase
    .from('loyalty_programs')
    .select('id, name, rounds_required, reward_name, reward_description, reward_expiry_days, default_round_value')
    .eq('vendor_id', vendorId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle<ProgramRow>()

  const canEdit = role === 'owner' || role === 'manager'

  if (canEdit) {
    return (
      <ProgramEditor
        vendorId={vendorId}
        vendorName={vendorData.business_name}
        program={program ?? null}
        logoUrl={vendorData.logo_url ?? ''}
        brandColor={vendorData.brand_color ?? '#1D1D1F'}
        stampIcon={vendorData.stamp_icon ?? '☕'}
        cardBackgroundUrl={vendorData.card_background_url ?? ''}
        stampBgColor={vendorData.stamp_bg_color ?? ''}
        cardFrontUrl={vendorData.card_front_url ?? ''}
        cardFrontHeadline={vendorData.card_front_headline ?? ''}
        cardFrontSubtext={vendorData.card_front_subtext ?? ''}
        cardBackMessage={vendorData.card_back_message ?? ''}
        cardFrontTextColor={vendorData.card_front_text_color ?? ''}
        cardBackTextColor={vendorData.card_back_text_color ?? ''}
        stampColor={vendorData.stamp_color ?? ''}
      />
    )
  }

  // Staff (read-only)
  if (!program) {
    return (
      <div className="glass rounded-3xl px-6 py-16 text-center">
        <Award className="mx-auto text-black/35 mb-4" size={40} />
        <h3 className="text-[#1D1D1F] font-semibold mb-2">No program yet</h3>
        <p className="text-black/35 text-sm">Contact your manager to set up a loyalty program.</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-3xl p-6 flex flex-col gap-1 text-sm">
      <h2 className="text-lg font-bold text-[#1D1D1F] mb-3">{program.name}</h2>
      <Row label="Rounds required" value={String(program.rounds_required)} />
      <Row label="Rounds per scan" value={String(program.default_round_value)} />
      <Row label="Reward" value={program.reward_name} />
      {program.reward_description && <Row label="Description" value={program.reward_description} />}
      {program.reward_expiry_days && <Row label="Expiry" value={`${program.reward_expiry_days} days`} />}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-black/5 last:border-0">
      <span className="text-black/40 font-medium shrink-0">{label}</span>
      <span className="text-[#1D1D1F] font-semibold text-right">{value}</span>
    </div>
  )
}

export default async function ProgramsPage() {
  // Reachable during onboarding — it's where the required program is created.
  const { vendor, role } = await getPortalData({ allowIncomplete: true })

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-1">{vendor.business_name}</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Program</h1>
          <p className="text-black/40 mt-1">Design your loyalty card and reward — see it update live.</p>
        </div>

        <Suspense fallback={null}>
          <ProgramView vendorId={vendor.id} vendorData={vendor} role={role} />
        </Suspense>
      </div>
    </main>
  )
}
