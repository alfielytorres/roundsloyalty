'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Stamp, Users, Send, Settings2 } from 'lucide-react'

const items = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/stamp', icon: Stamp, label: 'Stamp' },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/offers', icon: Send, label: 'Offers' },
  { href: '/settings', icon: Settings2, label: 'Settings' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-2 py-2 shadow-2xl">
      {items.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={`flex items-center justify-center w-11 h-11 rounded-full transition-all ${
              active ? 'bg-[#7DB542] text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
          </Link>
        )
      })}
    </nav>
  )
}
