import { getPortalData } from '@/lib/portal-data'

export default async function PortalShell({ children }: { children: React.ReactNode }) {
  const { vendor } = await getPortalData()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-8 pt-8 pb-2">
        <p className="text-white/40 text-sm font-semibold tracking-widest uppercase text-xs">{vendor.business_name}</p>
      </header>
      <div className="flex-1 pb-32">{children}</div>
    </div>
  )
}
