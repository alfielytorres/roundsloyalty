'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, QrCode, Users, FileCheck, Settings2 } from 'lucide-react'

const items = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home', color: '#2563EB' },
  { href: '/customers', icon: Users, label: 'Customers', color: '#D97706' },
  { href: '/stamp', icon: QrCode, label: 'Scan', primary: true, color: '#16A34A' },
  { href: '/claims', icon: FileCheck, label: 'Claims', color: '#DC2626' },
  { href: '/settings', icon: Settings2, label: 'Settings', color: '#6B7280' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-white/95 backdrop-blur-xl border border-[#E8E2D9] rounded-full px-3 py-2.5 shadow-lg shadow-black/10">
      {items.map(({ href, icon: Icon, label, primary, color }) => {
        const active = pathname === href || (!primary && href !== '/dashboard' && pathname.startsWith(href))
        const scanActive = primary && pathname.startsWith('/stamp')

        if (primary) {
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className="flex items-center justify-center w-14 h-14 -mt-8 rounded-full shadow-lg transition-all mx-2 bg-[#16A34A] hover:bg-[#15803D] shadow-green-200"
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
            style={active ? { color } : undefined}
            className={`flex items-center justify-center w-11 h-11 rounded-full transition-all text-sm ${
              active ? 'bg-gray-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.7} />
          </Link>
        )
      })}
    </nav>
  )
}
