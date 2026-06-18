import { getPortalData } from '@/lib/portal-data'
import BottomNav from './BottomNav'

export default async function PortalShell({ children }: { children: React.ReactNode }) {
  const { business } = await getPortalData()

  return (
    <div className="min-h-screen bg-[#0D1F0D] flex flex-col">
      <header className="px-8 pt-8 pb-2">
        <p className="text-white/40 text-sm font-semibold tracking-wide uppercase">{business.name}</p>
      </header>
      <div className="flex-1 pb-32">{children}</div>
      <BottomNav />
    </div>
  )
}
