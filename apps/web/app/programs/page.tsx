import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import { Settings2, Award, Plus } from 'lucide-react'

interface Program {
  id: string
  name: string
  program_type: string
  config: Record<string, unknown>
  is_active: boolean
  reward_rules: Array<{
    id: string
    name: string
    description: string | null
    stamp_threshold: number | null
    points_threshold: number | null
    reward_type: string
    is_active: boolean
  }>
}

async function ProgramView({ vendorId }: { vendorId: string }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: programs } = await supabase
    .from('loyalty_programs')
    .select(`
      id, name, program_type, config, is_active,
      reward_rules (id, name, description, stamp_threshold, points_threshold, reward_type, is_active)
    `)
    .eq('vendor_id', vendorId)
    .order('is_active', { ascending: false })

  if (!programs?.length) {
    return (
      <div className="bg-white/[.07] border border-white/10 rounded-3xl px-6 py-16 text-center">
        <Settings2 className="mx-auto text-white/20 mb-4" size={40} />
        <h3 className="text-white/60 font-semibold mb-2">No programs yet</h3>
        <p className="text-white/30 text-sm mb-6">Create your first loyalty program to start rewarding customers.</p>
        <form action="/api/programs/create" method="POST">
          <button type="submit" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Create program
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {(programs as Program[]).map((program) => (
        <div
          key={program.id}
          className={`bg-white/[.07] border rounded-3xl p-6 ${
            program.is_active ? 'border-[#8B5CF6]/30' : 'border-white/10 opacity-60'
          }`}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-white">{program.name}</h3>
                {program.is_active && (
                  <span className="text-xs font-bold bg-[#8B5CF6]/20 text-[#8B5CF6] px-2.5 py-0.5 rounded-full border border-[#8B5CF6]/30">
                    Active
                  </span>
                )}
              </div>
              <p className="text-white/50 text-sm capitalize">{program.program_type.replace('_', ' ')} program</p>
            </div>
            <form action="/api/programs/update" method="POST">
              <input type="hidden" name="program_id" value={program.id} />
              <input type="hidden" name="is_active" value={program.is_active ? 'false' : 'true'} />
              <button
                type="submit"
                className={`text-xs font-semibold rounded-xl px-3 py-1.5 border transition-colors ${
                  program.is_active
                    ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                    : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                {program.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </form>
          </div>

          {/* Config summary */}
          {program.config && (
            <div className="bg-white/5 rounded-2xl px-4 py-3 mb-4">
              <pre className="text-white/50 text-xs font-mono whitespace-pre-wrap">
                {JSON.stringify(program.config, null, 2)}
              </pre>
            </div>
          )}

          {/* Reward rules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wide flex items-center gap-2">
                <Award size={14} /> Reward rules
              </h4>
              <span className="text-white/30 text-xs">{program.reward_rules?.length ?? 0} rules</span>
            </div>
            {program.reward_rules?.length ? (
              <div className="flex flex-col gap-2">
                {program.reward_rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`glass-row flex items-center justify-between px-4 py-3 rounded-xl ${
                      !rule.is_active && 'opacity-50'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-white text-sm">{rule.name}</p>
                      {rule.description && (
                        <p className="text-white/50 text-xs mt-0.5">{rule.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {rule.stamp_threshold != null && (
                        <p className="text-[#8B5CF6] font-bold text-sm">{rule.stamp_threshold} stamps</p>
                      )}
                      {rule.points_threshold != null && (
                        <p className="text-[#8B5CF6] font-bold text-sm">{rule.points_threshold} pts</p>
                      )}
                      <p className="text-white/30 text-xs capitalize">{rule.reward_type}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-sm py-2">No reward rules yet.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function ProgramSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-6">
      <div className="bg-white/[.07] border border-white/10 rounded-3xl p-6 h-48" />
    </div>
  )
}

export default async function ProgramsPage() {
  const { vendor } = await getPortalData()

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-1">
            {vendor.business_name}
          </p>
          <h1 className="text-3xl font-extrabold text-white">Programs</h1>
          <p className="text-white/50 mt-1">Manage your loyalty program structure and rewards</p>
        </div>

        <Suspense fallback={<ProgramSkeleton />}>
          <ProgramView vendorId={vendor.id} />
        </Suspense>
      </div>
    </main>
  )
}
