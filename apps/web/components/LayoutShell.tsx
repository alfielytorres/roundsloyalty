'use client'

import { usePathname } from 'next/navigation'

const PORTAL_PREFIXES = [
  '/dashboard',
  '/stamp',
  '/customers',
  '/settings',
  '/programs',
  '/campaigns',
  '/devices',
  '/collections',
  '/staff',
  '/qr',
]

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPortal = PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
  return <div className={isPortal ? 'lg:pl-60 pb-24 lg:pb-0 min-h-screen' : ''}>{children}</div>
}
