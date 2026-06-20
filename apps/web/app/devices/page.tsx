import { getPortalData } from '@/lib/portal-data'
import DevicesClient from './DevicesClient'
import RegisterDeviceModal from './RegisterDeviceModal'

export default async function DevicesPage() {
  const { vendor } = await getPortalData()
  return (
    <DevicesClient
      vendorId={vendor.id}
      vendorName={vendor.business_name}
      RegisterDeviceModal={<RegisterDeviceModal vendorId={vendor.id} />}
    />
  )
}
