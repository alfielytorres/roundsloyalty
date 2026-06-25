'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, PackageCheck, Users, Settings2, Stamp } from 'lucide-react'

const items = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/collections', icon: PackageCheck, label: 'Collect' },
  { href: '/stamp', label: 'Stamp', primary: true },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/settings', icon: Settings2, label: 'Settings' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  function navigate(e: React.MouseEvent, href: string) {
    e.preventDefault()
    router.push(href)
  }

  return (
    <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-white/85 backdrop-blur-xl rounded-full px-3 py-2.5 shadow-lg border border-white">
      {items.map(({ href, icon: Icon, label, primary }) => {
        const active = pathname === href || (!primary && href !== '/dashboard' && pathname.startsWith(href))

        if (primary) {
          return (
            <button key={href} onClick={(e) => navigate(e, href)} title={label}
              className="flex items-center justify-center w-12 h-12 -mt-6 rounded-full bg-rounds hover:bg-rounds-hover shadow-md transition-all mx-2">
              <Stamp size={22} className="text-white" />
            </button>
          )
        }

        return (
          <button key={href} onClick={(e) => navigate(e, href)} title={label}
            className={`flex flex-col items-center justify-center w-11 h-11 rounded-full gap-0.5 transition-all ${
              active ? 'text-rounds' : 'text-black/30 hover:text-black/55'
            }`}>
            {Icon && <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />}
            <span className="text-[9px] font-semibold leading-none">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
