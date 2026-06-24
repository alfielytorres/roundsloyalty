'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard, Award, Megaphone, Cpu, PackageCheck,
  Users, UserCog, QrCode, Settings2, X, Stamp,
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

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  return (
    <>
      {/* Floating pill */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-3 py-2 rounded-full bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">

        {/* Hamburger */}
        <button onClick={() => setOpen(true)}
          className="w-11 h-11 flex items-center justify-center rounded-full text-black/40 hover:text-black/70 hover:bg-black/5 transition-all">
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
            <rect y="0" width="18" height="2" rx="1" fill="currentColor"/>
            <rect y="6" width="13" height="2" rx="1" fill="currentColor"/>
            <rect y="12" width="18" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>

        {/* Stamp — raised center button */}
        <button onClick={() => navigate('/stamp')}
          className="w-12 h-12 -mt-5 flex items-center justify-center rounded-full bg-[#1D1D1F] shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:bg-black transition-all active:scale-95 mx-1">
          <Stamp size={20} className="text-white" />
        </button>

        {/* Collections */}
        <button onClick={() => navigate('/collections')}
          className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${
            pathname.startsWith('/collections') ? 'text-[#1D1D1F] bg-black/8' : 'text-black/40 hover:text-black/70 hover:bg-black/5'
          }`}>
          <PackageCheck size={20} strokeWidth={pathname.startsWith('/collections') ? 2.2 : 1.7} />
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-72 max-w-[85vw] bg-white/95 backdrop-blur-2xl h-full flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-14 pb-5 border-b border-black/5">
              <div className="flex items-center gap-3">
                <Image src="/logo.svg" alt="Rounds" width={22} height={22} unoptimized className="rounded-md" />
                <p className="font-black text-[#111] tracking-tight text-base leading-none">Rounds</p>
              </div>
              <button onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors">
                <X size={15} className="text-black/50" />
              </button>
            </div>

            {/* Stamp CTA */}
            <div className="px-4 pt-4 pb-2">
              <button
                onClick={() => navigate('/stamp')}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm bg-[#1D1D1F] text-white hover:bg-black transition-all"
              >
                <QrCode size={17} strokeWidth={2.2} />
                Stamp Customer
              </button>
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
                        <button key={href} onClick={() => navigate(href)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                            active
                              ? 'bg-black/8 text-[#1D1D1F] font-semibold'
                              : 'text-black/40 font-medium hover:bg-black/5 hover:text-black/70'
                          }`}>
                          <Icon size={17} strokeWidth={active ? 2.2 : 1.7} />
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="px-5 py-5 border-t border-black/5 pb-safe">
              <p className="text-xs text-black/25 font-medium">© {new Date().getFullYear()} Rounds</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
