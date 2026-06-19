import { getPortalData } from '@/lib/portal-data'
import QRDisplay from './QRDisplay'

export default async function QRPage() {
  const { vendor } = await getPortalData()

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-[#9CA3AF] text-xs font-semibold tracking-widest uppercase mb-1">
            {vendor.business_name}
          </p>
          <h1 className="text-3xl font-extrabold text-[#111111]">My QR Code</h1>
        </div>
        <QRDisplay />
      </div>
    </main>
  )
}
