'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const PORTAL_PREFIXES = [
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

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPortal = PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const [gated, setGated] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isPortal) { setGated(null); return }
    let cancelled = false
    fetch('/api/onboarding/status')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setGated(!!d.gated) })
      .catch(() => { if (!cancelled) setGated(false) })
    return () => { cancelled = true }
  }, [isPortal, pathname])

  if (!isPortal) return <div>{children}</div>
  // Onboarding lock: no sidebar gutter, leave room for the slim fixed setup bar.
  if (gated) return <div className="pt-20 pb-24 min-h-screen">{children}</div>
  // pt-6 reserves a top strip so the fixed notifications bell (top-right) never
  // overlaps a page's own header action buttons.
  return <div className="lg:pl-60 pt-6 pb-24 lg:pb-0 min-h-screen">{children}</div>
}
