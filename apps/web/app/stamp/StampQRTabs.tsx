'use client'

import { useState } from 'react'
import { QrCode, ScanLine } from 'lucide-react'
import QRDisplay from '../qr/QRDisplay'
import StampScanner from './StampScanner'

export default function StampQRTabs({ vendorId }: { vendorId: string }) {
  const [tab, setTab] = useState<'qr' | 'scan'>('qr')

  return (
    <div>
      <div className="flex gap-2 p-1 bg-black/5 rounded-2xl mb-6">
        <button
          onClick={() => setTab('qr')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === 'qr' ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-black/40 hover:text-[#1D1D1F]'
          }`}
        >
          <QrCode size={15} />
          My QR Code
        </button>
        <button
          onClick={() => setTab('scan')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === 'scan' ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-black/40 hover:text-[#1D1D1F]'
          }`}
        >
          <ScanLine size={15} />
          Scan Customer
        </button>
      </div>

      {tab === 'qr' ? <QRDisplay /> : <StampScanner vendorId={vendorId} />}
    </div>
  )
}
