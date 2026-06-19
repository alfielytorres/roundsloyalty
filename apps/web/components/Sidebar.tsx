'use client'

import Link from 'next/link'
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
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: '#2563EB' },
  { href: '/programs', icon: Award, label: 'Program', color: '#8B5CF6' },
  { href: '/campaigns', icon: Megaphone, label: 'Campaigns', color: '#E8805A' },
  { href: '/devices', icon: Cpu, label: 'NFC Devices', color: '#0891B2' },
  { href: '/collections', icon: PackageCheck, label: 'Collections', color: '#16A34A' },
  { href: '/customers', icon: Users, label: 'Customers', color: '#D97706' },
  { href: '/staff', icon: UserCog, label: 'Staff', color: '#6366F1' },
  { href: '/stamp', icon: QrCode, label: 'Stamp', color: '#E8805A' },
  { href: '/settings', icon: Settings2, label: 'Settings', color: '#6B7280' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-60 bg-white border-r border-[#E8E2D9] flex-col z-40">
      <div className="px-5 py-5 border-b border-[#E8E2D9]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#E8805A] flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm">R</span>
          </div>
          <span className="font-bold text-[#111111]">Rounds Loyalty</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {items.map(({ href, icon: Icon, label, color }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

          return (
            <Link
              key={href}
              href={href}
              style={active ? { backgroundColor: color + '18', color } : {}}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active ? 'font-semibold' : 'text-[#6B7280] hover:bg-[#F8F5F1] hover:text-[#111111]'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-[#E8E2D9]">
        <p className="text-xs text-[#9CA3AF] font-medium">© 2025 Rounds Loyalty</p>
      </div>
    </aside>
  )
}
