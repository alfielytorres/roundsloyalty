'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard, Award, Megaphone, Cpu, PackageCheck,
  Users, UserCog, QrCode, Settings2, X, Menu,
} from 'lucide-react'

const items = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/programs', icon: Award, label: 'Program' },
  { href: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { href: '/devices', icon: Cpu, label: 'NFC Devices' },
  { href: '/collections', icon: PackageCheck, label: 'Collections' },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/staff', icon: UserCog, label: 'Staff' },
  { href: '/settings', icon: Settings2, label: 'Settings' },
]

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      {/* Bottom bar: hamburger + stamp */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-black/5 flex items-center justify-between px-6 py-3 pb-safe">
        <button onClick={() => setOpen(true)}
          className="flex flex-col items-center gap-1 text-black/40 hover:text-black/70 transition-colors">
          <Menu size={22} strokeWidth={1.7} />
          <span className="text-[10px] font-semibold tracking-wide uppercase">Menu</span>
        </button>

        <button onClick={() => navigate('/stamp')}
          className="flex flex-col items-center gap-1 text-black/40 hover:text-black/70 transition-colors">
          <div className="w-12 h-12 -mt-6 rounded-full bg-[#1D1D1F] flex items-center justify-center shadow-lg">
            <Image src="/logo.svg" alt="Stamp" width={22} height={22} className="invert" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide uppercase mt-0.5">Stamp</span>
        </button>

        <button onClick={() => navigate('/collections')}
          className={`flex flex-col items-center gap-1 transition-colors ${pathname.startsWith('/collections') ? 'text-[#1D1D1F]' : 'text-black/40 hover:text-black/70'}`}>
          <PackageCheck size={22} strokeWidth={pathname.startsWith('/collections') ? 2.2 : 1.7} />
          <span className="text-[10px] font-semibold tracking-wide uppercase">Collections</span>
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-black/5">
              <div className="flex items-center gap-3">
                <Image src="/logo.svg" alt="Rounds" width={24} height={24} className="opacity-90" />
                <div>
                  <span className="font-black text-[#111] tracking-wider text-sm">ROUND REWARDS</span>
                  <span className="block text-[10px] text-black/30 font-semibold tracking-widest uppercase leading-none">VENDOR</span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors">
                <X size={15} className="text-black/50" />
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
              {items.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <button key={href} onClick={() => navigate(href)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all text-left ${
                      active
                        ? 'bg-[#1D1D1F] text-white font-semibold'
                        : 'text-black/40 font-medium hover:bg-black/5 hover:text-black/70'
                    }`}>
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />
                    {label}
                  </button>
                )
              })}
            </nav>

            <div className="px-4 py-4 border-t border-black/5">
              <p className="text-xs text-black/25 font-medium">© 2025 Round Rewards</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
