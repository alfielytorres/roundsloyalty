import { getPortalData } from '@/lib/portal-data'
import QRDisplay from './QRDisplay'

export default async function QRPage() {
  const { vendor } = await getPortalData()

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-1">
            {vendor.business_name}
          </p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">My QR Code</h1>
        </div>
        <QRDisplay />
      </div>
    </main>
  )
}
