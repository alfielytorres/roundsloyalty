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
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home', color: '#2563EB' },
  { href: '/collections', icon: PackageCheck, label: 'Collections', color: '#16A34A' },
  { href: '/stamp', icon: QrCode, label: 'Stamp', primary: true, color: '#E8805A' },
  { href: '/customers', icon: Users, label: 'Customers', color: '#D97706' },
  { href: '/settings', icon: Settings2, label: 'Settings', color: '#6B7280' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white border border-[#E8E2D9] rounded-full px-4 py-3 shadow-xl">
      {items.map(({ href, icon: Icon, label, primary, color }) => {
        const active = pathname === href || (!primary && href !== '/dashboard' && pathname.startsWith(href))
        const scanActive = primary && pathname.startsWith(href)

        if (primary) {
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center justify-center w-14 h-14 -mt-8 rounded-full shadow-xl transition-all mx-3 ${
                scanActive ? 'bg-[#d4714e]' : 'bg-[#E8805A] hover:bg-[#d4714e]'
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
            style={active ? { color } : {}}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
              active ? '' : 'text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#F8F5F1]'
            }`}
          >
            <Icon size={21} strokeWidth={active ? 2.2 : 1.7} />
          </Link>
        )
      })}
    </nav>
  )
}
