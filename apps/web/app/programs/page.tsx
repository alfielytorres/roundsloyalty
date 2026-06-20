import { getPortalData } from '@/lib/portal-data'
import ProgramsClient from './ProgramsClient'

export default async function ProgramsPage() {
  const { vendor, program, role } = await getPortalData()
  const canEdit = role === 'owner' || role === 'manager'

  return (
    <ProgramsClient
      vendor={{ id: vendor.id, business_name: vendor.business_name, logo_url: vendor.logo_url ?? null, brand_color: vendor.brand_color ?? null }}
      initialProgram={program ?? null}
      canEdit={canEdit}
    />
  )
}
