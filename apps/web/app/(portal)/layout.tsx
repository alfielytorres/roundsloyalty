import { getPortalData } from '@/lib/portal-data'
import BottomNav from '@/components/BottomNav'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // getPortalData handles auth check + redirect to /onboarding if no vendor.
  // React cache() means any page calling getPortalData() in the same render
  // shares the result — zero extra DB calls.
  await getPortalData()

  return (
    <>
      {children}
      <BottomNav />
    </>
  )
}
