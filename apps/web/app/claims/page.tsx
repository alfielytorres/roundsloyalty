import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

interface Claim {
  id: string
  amount: number | null
  description: string | null
  status: string
  notes: string | null
  created_at: string
  profiles: { display_name: string | null } | null
}

async function ClaimsTable({ vendorId }: { vendorId: string }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: claims } = await supabase
    .from('proof_of_purchase_claims')
    .select('id, amount, description, status, notes, created_at, profiles(display_name)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!claims?.length) {
    return (
      <div className="bg-white/[.07] border border-white/10 rounded-3xl px-6 py-16 text-center text-white/40">
        No claims yet. Customers can submit proof-of-purchase from the app.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {claims.map((c) => {
        const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
        const name = (profile as { display_name?: string | null } | null)?.display_name ?? 'Anonymous'
        const isPending = c.status === 'pending'

        return (
          <div
            key={c.id}
            className={`bg-white/[.07] border rounded-2xl px-5 py-4 flex items-start gap-4 ${
              isPending ? 'border-yellow-500/30' : c.status === 'approved' ? 'border-emerald-500/30' : 'border-red-500/20'
            }`}
          >
            <div className="mt-0.5">
              {c.status === 'approved' ? (
                <CheckCircle className="text-emerald-400" size={20} />
              ) : c.status === 'rejected' ? (
                <XCircle className="text-red-400" size={20} />
              ) : (
                <Clock className="text-yellow-400" size={20} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4 mb-1">
                <span className="font-bold text-white">{name}</span>
                <span className="text-xs text-white/40 shrink-0">
                  {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {c.amount != null && (
                <div className="text-[#8B5CF6] font-bold text-lg mb-1">${c.amount.toFixed(2)}</div>
              )}
              {c.description && (
                <p className="text-white/60 text-sm mb-2">{c.description}</p>
              )}
              {c.notes && (
                <p className="text-white/40 text-xs italic">Note: {c.notes}</p>
              )}
            </div>
            {isPending && (
              <div className="flex flex-col gap-2 shrink-0">
                <form action={`/api/claims/${c.id}/review`} method="POST">
                  <input type="hidden" name="status" value="approved" />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-semibold text-sm rounded-xl px-4 py-2 transition-colors"
                  >
                    <CheckCircle size={14} />
                    Approve
                  </button>
                </form>
                <form action={`/api/claims/${c.id}/review`} method="POST">
                  <input type="hidden" name="status" value="rejected" />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold text-sm rounded-xl px-4 py-2 transition-colors"
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                </form>
              </div>
            )}
            {!isPending && (
              <div className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full capitalize ${
                c.status === 'approved'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}>
                {c.status}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ClaimsSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white/[.07] border border-white/10 rounded-2xl px-5 py-4 h-20" />
      ))}
    </div>
  )
}

export default async function ClaimsPage() {
  const { vendor } = await getPortalData()

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { count: pendingCount } = await supabase
    .from('proof_of_purchase_claims')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', vendor.id)
    .eq('status', 'pending')

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-1">
            {vendor.business_name}
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white">Claims</h1>
            {(pendingCount ?? 0) > 0 && (
              <span className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs font-bold px-2.5 py-1 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="text-white/50 mt-1">Review proof-of-purchase submissions from customers</p>
        </div>

        <Suspense fallback={<ClaimsSkeleton />}>
          <ClaimsTable vendorId={vendor.id} />
        </Suspense>
      </div>
    </main>
  )
}
