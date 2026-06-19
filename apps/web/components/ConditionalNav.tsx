'use client'

import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'

const PORTAL_ROUTES = [
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

export default function ConditionalNav() {
  const pathname = usePathname()
  const show = PORTAL_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))
  if (!show) return null
  return (
    <>
      <Sidebar />
      <BottomNav />
    </>
  )
}
