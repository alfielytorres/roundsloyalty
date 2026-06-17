import { getPortalData } from '@/lib/portal-data'
import NavBar from './NavBar'

export default async function PortalShell({ children }: { children: React.ReactNode }) {
  const { business } = await getPortalData()

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <NavBar businessName={business.name} />
      <div className="flex-1">{children}</div>
    </div>
  )
}
