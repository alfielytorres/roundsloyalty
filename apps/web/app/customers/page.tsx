import { getPortalData } from '@/lib/portal-data'
import CustomersClient from './CustomersClient'

export default async function CustomersPage() {
  const { vendor } = await getPortalData()
  return <CustomersClient vendorId={vendor.id} vendorName={vendor.business_name} />
}
