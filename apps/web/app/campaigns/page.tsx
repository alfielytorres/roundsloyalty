import { getPortalData } from '@/lib/portal-data'
import CampaignsClient from './CampaignsClient'

export default async function CampaignsPage() {
  const { vendor } = await getPortalData()

  return (
    <main className="min-h-screen px-5 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <CampaignsClient vendorId={vendor.id} vendorName={vendor.business_name} />
      </div>
    </main>
  )
}
