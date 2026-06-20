import { getPortalData } from '@/lib/portal-data'
import AddStaffModal from './AddStaffModal'
import StaffClient from './StaffClient'

export default async function StaffPage() {
  const { vendor, role } = await getPortalData()
  const canManage = role === 'owner' || role === 'manager'
  return (
    <StaffClient
      vendorId={vendor.id}
      vendorName={vendor.business_name}
      canManage={canManage}
      AddStaffModal={canManage ? <AddStaffModal vendorId={vendor.id} /> : null}
    />
  )
}
