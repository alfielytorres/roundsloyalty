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

const groups = [
  {
    label: 'Daily',
    items: [
      { href: '/collections', icon: PackageCheck, label: 'Collections' },
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/customers', icon: Users, label: 'Customers' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { href: '/programs', icon: Award, label: 'Program' },
      { href: '/campaigns', icon: Megaphone, label: 'Campaigns' },
      { href: '/staff', icon: UserCog, label: 'Staff' },
    ],
  },
  {
    label: 'Setup',
    items: [
      { href: '/devices', icon: Cpu, label: 'NFC Devices' },
      { href: '/settings', icon: Settings2, label: 'Settings' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-60 bg-white/50 backdrop-blur-xl border-r border-black/5 flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-black/5">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="Rounds" width={28} height={28} unoptimized className="rounded-md" />
          <span className="font-black text-[#111] tracking-tight text-base">Rounds</span>
        </div>
      </div>

      {/* Stamp CTA */}
      <div className="px-3 pt-4 pb-2">
        <Link
          href="/stamp"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm transition-all bg-rounds hover:bg-rounds-hover text-white"
        >
          <QrCode size={17} strokeWidth={2.2} />
          Stamp Customer
        </Link>
      </div>

      {/* Grouped nav */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-4 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-bold tracking-widest uppercase text-black/25">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ href, icon: Icon, label }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                      active
                        ? 'bg-rounds-soft text-rounds font-semibold'
                        : 'text-black/40 font-medium hover:bg-black/5 hover:text-black/70'
                    }`}
                  >
                    <Icon size={17} strokeWidth={active ? 2.2 : 1.7} />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-black/5">
        <p className="text-xs text-black/25 font-medium">© {new Date().getFullYear()} Rounds</p>
      </div>
    </aside>
  )
}
