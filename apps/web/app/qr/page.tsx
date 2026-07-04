import { Printer } from 'lucide-react'
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

        {vendor.join_token && (
          <div className="mt-6 flex justify-center">
            <a
              href={`/sign/${vendor.join_token}`}
              target="_blank"
              className="inline-flex items-center gap-2 text-sm font-semibold rounded-2xl px-5 py-3 border border-black/10 text-black/50 hover:border-black/25 hover:text-black/70 bg-white/60 backdrop-blur-sm transition-colors"
            >
              <Printer size={15} />
              Print a counter sign for your store
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
