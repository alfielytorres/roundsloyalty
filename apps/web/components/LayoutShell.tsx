'use client'

import { usePathname } from 'next/navigation'

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
  // pt-6 reserves a top strip so the fixed notifications bell (top-right) never
  // overlaps a page's own header action buttons.
  return <div className={isPortal ? 'lg:pl-60 pt-6 pb-24 lg:pb-0 min-h-screen' : ''}>{children}</div>
}
