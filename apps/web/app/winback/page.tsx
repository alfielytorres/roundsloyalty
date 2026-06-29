import { getPortalData } from '@/lib/portal-data'
import WinbackClient from './WinbackClient'

export default async function WinbackPage() {
  const { vendor } = await getPortalData()
  return <WinbackClient vendorId={vendor.id} vendorName={vendor.business_name} />
}
