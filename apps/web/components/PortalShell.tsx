import { getPortalData } from '@/lib/portal-data'

export default async function PortalShell({ children }: { children: React.ReactNode }) {
  const { business } = await getPortalData()

  return (
    <div className="min-h-screen bg-[#0D1F0D] flex flex-col">
      <header className="px-8 pt-8 pb-2">
        <p className="text-white/40 text-sm font-semibold tracking-widest uppercase text-xs">{business.name}</p>
      </header>
      <div className="flex-1 pb-32">{children}</div>
    </div>
  )
}
