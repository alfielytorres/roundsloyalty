import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import { Award } from 'lucide-react'

interface LoyaltyProgram {
  id: string
  name: string
  rounds_required: number
  reward_name: string
  reward_description: string | null
  reward_expiry_days: number | null
  default_round_value: number
  max_round_value: number
  status: string
}

async function ProgramView({ vendorId, role }: { vendorId: string; role: string }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: program } = await supabase
    .from('loyalty_programs')
    .select('id, name, rounds_required, reward_name, reward_description, reward_expiry_days, default_round_value, max_round_value, status')
    .eq('vendor_id', vendorId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  const canEdit = role === 'owner' || role === 'manager'

  if (!program) {
    if (!canEdit) {
      return (
        <div className="glass rounded-3xl px-6 py-16 text-center ">
          <Award className="mx-auto text-black/35 mb-4" size={40} />
          <h3 className="text-[#1D1D1F] font-semibold mb-2">No program yet</h3>
          <p className="text-black/35 text-sm">Contact your manager to set up a loyalty program.</p>
        </div>
      )
    }
    return (
      <div className="glass rounded-3xl px-6 py-16 text-center ">
        <Award className="mx-auto text-black/35 mb-4" size={40} />
        <h3 className="text-[#1D1D1F] font-semibold mb-2">No program yet</h3>
        <p className="text-black/35 text-sm mb-6">Create your loyalty program to start rewarding customers.</p>
        <form action="/api/programs/upsert" method="POST">
          <input type="hidden" name="vendor_id" value={vendorId} />
          <button type="submit" className="btn-primary">Create program</button>
        </form>
      </div>
    )
  }

  return (
    <div className="glass rounded-3xl p-6 ">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs font-bold bg-[#1D1D1F] text-white px-2.5 py-1 rounded-full">Active</span>
        <h2 className="text-lg font-bold text-[#1D1D1F]">{program.name}</h2>
      </div>

      {canEdit ? (
        <form action="/api/programs/upsert" method="POST" className="flex flex-col gap-5">
          <input type="hidden" name="program_id" value={program.id} />
          <input type="hidden" name="vendor_id" value={vendorId} />

          <div>
            <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Program name</label>
            <input name="name" required defaultValue={program.name} className="w-full dark-input" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Rounds required</label>
              <input type="number" name="rounds_required" min="1" max="200" required defaultValue={program.rounds_required} className="w-full dark-input" />
              <p className="text-black/35 text-xs mt-1">Rounds needed to earn reward</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Default round value</label>
              <input type="number" name="default_round_value" min="1" max="5" required defaultValue={program.default_round_value} className="w-full dark-input" />
              <p className="text-black/35 text-xs mt-1">Rounds per scan</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Maximum round value</label>
            <input type="number" name="max_round_value" min="1" max="10" required defaultValue={program.max_round_value} className="w-full dark-input" />
            <p className="text-black/35 text-xs mt-1">Maximum rounds that can be awarded per scan (e.g. during campaigns)</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Reward name</label>
            <input name="reward_name" required defaultValue={program.reward_name} className="w-full dark-input" placeholder="e.g. Free Coffee" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Reward description</label>
            <textarea name="reward_description" rows={3} defaultValue={program.reward_description ?? ''} placeholder="Describe the reward for customers" className="w-full dark-input resize-none" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Reward expiry (days)</label>
            <input type="number" name="reward_expiry_days" min="1" max="365" defaultValue={program.reward_expiry_days ?? 30} className="w-full dark-input" />
            <p className="text-black/35 text-xs mt-1">Days until an unlocked reward expires</p>
          </div>

          <button type="submit" className="btn-primary self-start">Save changes</button>
        </form>
      ) : (
        <div className="flex flex-col gap-4 text-sm">
          <Row label="Rounds required" value={String(program.rounds_required)} />
          <Row label="Default round value" value={String(program.default_round_value)} />
          <Row label="Max round value" value={String(program.max_round_value)} />
          <Row label="Reward" value={program.reward_name} />
          {program.reward_description && <Row label="Description" value={program.reward_description} />}
          {program.reward_expiry_days && <Row label="Expiry" value={`${program.reward_expiry_days} days`} />}
        </div>
      )}
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

export default async function ProgramsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { vendor, role } = await getPortalData()
  const query = await searchParams

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-1">{vendor.business_name}</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Program</h1>
          <p className="text-black/40 mt-1">Manage your loyalty program and reward structure</p>
        </div>

        {query.error && <div className="mb-5 p-4 bg-black/5 border border-black/10 rounded-2xl text-black/60 text-sm">{query.error}</div>}
        {query.success && <div className="mb-5 p-4 bg-black/5 border border-black/15 rounded-2xl text-black/70 text-sm font-semibold">{query.success}</div>}

        <Suspense fallback={
          <div className="glass rounded-3xl p-6  animate-pulse">
            <div className="h-6 w-40 bg-black/15 rounded mb-4" />
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-black/10 rounded-2xl mb-3" />)}
          </div>
        }>
          <ProgramView vendorId={vendor.id} role={role} />
        </Suspense>
      </div>
    </main>
  )
}
