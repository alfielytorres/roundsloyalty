import { getPortalData } from '@/lib/portal-data'
import CampaignsClient from './CampaignsClient'

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { vendor } = await getPortalData()
  const query = await searchParams

  return (
    <main className="min-h-screen px-5 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        {query?.error && (
          <div className="mb-5 p-4 bg-black/5 border border-black/10 rounded-2xl text-black/60 text-sm">{query.error}</div>
        )}
        {query?.success && (
          <div className="mb-5 p-4 bg-black/5 border border-black/15 rounded-2xl text-black/70 text-sm font-semibold">{query.success}</div>
        )}

        <CampaignsClient vendorId={vendor.id} vendorName={vendor.business_name} />
      </div>
    </main>
  )
}
