'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Stamp, Users, Send, Settings2 } from 'lucide-react'

const items = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/stamp', icon: Stamp, label: 'Stamp', primary: true },
  { href: '/offers', icon: Send, label: 'Offers' },
  { href: '/settings', icon: Settings2, label: 'Settings' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-[#111]/80 backdrop-blur-xl border border-white/[.08] rounded-full px-3 py-3 shadow-2xl">
      {items.map(({ href, icon: Icon, label, primary }) => {
        const active = pathname === href || (href !== '/dashboard' && !primary && pathname.startsWith(href))
        const stampActive = primary && pathname.startsWith('/stamp')

        if (primary) {
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center justify-center w-14 h-14 -mt-7 rounded-full shadow-xl transition-all mx-2 ${
                stampActive
                  ? 'bg-[#7DB542] shadow-[0_0_24px_rgba(125,181,66,0.6)]'
                  : 'bg-[#7DB542] shadow-[0_0_16px_rgba(125,181,66,0.35)] hover:shadow-[0_0_24px_rgba(125,181,66,0.55)]'
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
            className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all ${
              active
                ? 'bg-[#7DB542]/15 text-[#7DB542]'
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
