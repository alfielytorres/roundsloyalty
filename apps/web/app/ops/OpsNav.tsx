'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, QrCode, CreditCard, MapPin, ArrowLeft } from 'lucide-react'

const tabs = [
  { href: '/ops', label: 'Store signs', icon: FileText },
  { href: '/ops/stands', label: 'QR stands', icon: QrCode },
  { href: '/ops/cards', label: 'Cards', icon: CreditCard },
  { href: '/ops/locations', label: 'Locations', icon: MapPin },
]

export default function OpsNav() {
  const pathname = usePathname()
  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/5 w-fit">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                active ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-black/45 hover:text-black/70'
              }`}>
              <Icon size={14} /> {label}
            </Link>
          )
        })}
      </div>
      <Link href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-black/45 hover:text-black/70 transition-colors">
        <ArrowLeft size={14} /> Store view
      </Link>
    </div>
  )
}
