'use client'

import QRCode from 'react-qr-code'
import { Printer } from 'lucide-react'

export function SignQR({ value, size = 232 }: { value: string; size?: number }) {
  return <QRCode value={value} size={size} />
}

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden fixed top-4 right-4 z-50 inline-flex items-center gap-2 btn-primary text-sm"
    >
      <Printer size={16} /> Print sign
    </button>
  )
}
