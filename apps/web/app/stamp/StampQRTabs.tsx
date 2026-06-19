'use client'

import { useState } from 'react'
import { QrCode, ScanLine } from 'lucide-react'
import QRDisplay from '../qr/QRDisplay'
import StampScanner from './StampScanner'

export default function StampQRTabs({ vendorId }: { vendorId: string }) {
  const [tab, setTab] = useState<'qr' | 'scan'>('qr')

  return (
    <div>
      <div className="flex gap-2 p-1 bg-[#F0EDE6] rounded-2xl mb-6">
        <button
          onClick={() => setTab('qr')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === 'qr' ? 'bg-white text-[#16A34A] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'
          }`}
        >
          <QrCode size={15} />
          My QR Code
        </button>
        <button
          onClick={() => setTab('scan')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === 'scan' ? 'bg-white text-[#16A34A] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'
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
