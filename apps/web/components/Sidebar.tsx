'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Award,
  Megaphone,
  Cpu,
  PackageCheck,
  Users,
  UserCog,
  QrCode,
  Settings2,
} from 'lucide-react'

const items = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/programs', icon: Award, label: 'Program' },
  { href: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { href: '/devices', icon: Cpu, label: 'NFC Devices' },
  { href: '/collections', icon: PackageCheck, label: 'Collections' },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/staff', icon: UserCog, label: 'Staff' },
  { href: '/stamp', icon: QrCode, label: 'Stamp' },
  { href: '/settings', icon: Settings2, label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-60 bg-white/50 backdrop-blur-xl border-r border-black/5 flex-col z-40">
      <div className="px-5 py-5 border-b border-black/5">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Rounds" width={28} height={28} className="opacity-90" />
          <div>
            <span className="font-black text-[#111] tracking-wider text-sm">ROUNDS</span>
            <span className="block text-[10px] text-black/30 font-semibold tracking-widest uppercase leading-none">VENDOR</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                active
                  ? 'bg-[#1D1D1F] text-white font-semibold'
                  : 'text-black/40 font-medium hover:bg-black/5 hover:text-black/70'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-black/5">
        <p className="text-xs text-black/25 font-medium">© 2025 Rounds Loyalty</p>
      </div>
    </aside>
  )
}
