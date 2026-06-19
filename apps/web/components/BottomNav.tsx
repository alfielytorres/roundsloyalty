'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  QrCode,
  PackageCheck,
  Users,
  Settings2,
} from 'lucide-react'

const items = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/collections', icon: PackageCheck, label: 'Collections' },
  { href: '/stamp', icon: QrCode, label: 'Stamp', primary: true },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/settings', icon: Settings2, label: 'Settings' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[rgba(17,17,17,0.95)] backdrop-blur-md rounded-full px-4 py-3 shadow-2xl border border-white/10">
      {items.map(({ href, icon: Icon, label, primary }) => {
        const active = pathname === href || (!primary && href !== '/dashboard' && pathname.startsWith(href))
        const scanActive = primary && pathname.startsWith(href)

        if (primary) {
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center justify-center w-14 h-14 -mt-8 rounded-full shadow-xl transition-all mx-3 ${
                scanActive
                  ? 'bg-gradient-to-br from-[#E8805A] to-[#8B3A1A] opacity-90'
                  : 'bg-gradient-to-br from-[#E8805A] to-[#8B3A1A] hover:opacity-90'
              }`}
            >
              <Icon size={24} strokeWidth={2.5} className="text-white" />
            </Link>
          )
        }

        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
              active ? 'text-[#E8805A]' : 'text-white/30 hover:text-white/60'
            }`}
          >
            <Icon size={21} strokeWidth={active ? 2.2 : 1.7} />
          </Link>
        )
      })}
    </nav>
  )
}
