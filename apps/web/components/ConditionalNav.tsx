'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, ArrowRight } from 'lucide-react'
import MobileNav from './MobileNav'
import Sidebar from './Sidebar'
import NotificationsBell from './NotificationsBell'

const PORTAL_ROUTES = [
  '/dashboard',
  '/stamp',
  '/customers',
  '/settings',
  '/programs',
  '/campaigns',
  '/winback',
  '/devices',
  '/collections',
  '/staff',
  '/qr',
  '/setup',
]

export default function ConditionalNav() {
  const pathname = usePathname()
  const show = PORTAL_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))
  const [gated, setGated] = useState<boolean | null>(null)

  useEffect(() => {
    if (!show) { setGated(null); return }
    let cancelled = false
    fetch('/api/onboarding/status')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setGated(!!d.gated) })
      .catch(() => { if (!cancelled) setGated(false) })
    return () => { cancelled = true }
  }, [show, pathname])

  if (!show) return null

  // Onboarding lock: no portal nav — just a slim bar back to the setup checklist,
  // so an unfinished store can't wander into the dashboard / NFC ordering / etc.
  if (gated) {
    return (
      <div className="fixed top-0 inset-x-0 z-40 flex items-center justify-between gap-3 px-5 h-14 bg-white/80 backdrop-blur-xl border-b border-black/5">
        <span className="inline-flex items-center gap-2 font-black tracking-tight text-[#1D1D1F]">
          <Image src="/logo.svg" alt="Weekends Club" width={26} height={26} unoptimized className="rounded-md" /> Weekends Club
        </span>
        <Link href="/setup" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#1D1D1F] rounded-xl px-3 py-2">
          <Sparkles size={13} /> Finish setup <ArrowRight size={13} />
        </Link>
      </div>
    )
  }

  return (
    <>
      <Sidebar />
      <MobileNav />
      <NotificationsBell />
    </>
  )
}
