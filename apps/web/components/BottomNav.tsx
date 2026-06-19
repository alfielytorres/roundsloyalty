'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, QrCode, Users, FileCheck, Settings2 } from 'lucide-react'

const items = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/stamp', icon: QrCode, label: 'Scan', primary: true },
  { href: '/claims', icon: FileCheck, label: 'Claims' },
  { href: '/settings', icon: Settings2, label: 'Settings' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#0A1A0E]/90 backdrop-blur-xl border border-white/[.08] rounded-full px-4 py-3 shadow-2xl">
      {items.map(({ href, icon: Icon, label, primary }) => {
        const active = pathname === href || (!primary && href !== '/dashboard' && pathname.startsWith(href))
        const scanActive = primary && pathname.startsWith('/stamp')

        if (primary) {
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center justify-center w-14 h-14 -mt-8 rounded-full shadow-xl transition-all mx-3 ${
                scanActive
                  ? 'bg-[#22C55E] shadow-[0_0_24px_rgba(34,197,94,0.6)]'
                  : 'bg-[#22C55E] shadow-[0_0_16px_rgba(34,197,94,0.35)] hover:shadow-[0_0_24px_rgba(34,197,94,0.55)]'
              }`}
            >
              <Icon size={24} strokeWidth={2.5} className="text-[#081C12]" />
            </Link>
          )
        }

        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
              active
                ? 'bg-[#22C55E]/15 text-[#22C55E]'
                : 'text-white/35 hover:text-white/70 hover:bg-white/[.07]'
            }`}
          >
            <Icon size={21} strokeWidth={active ? 2.2 : 1.7} />
          </Link>
        )
      })}
    </nav>
  )
}
