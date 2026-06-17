'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/stamp', label: 'Stamp' },
  { href: '/customers', label: 'Customers' },
  { href: '/offers', label: 'Offers' },
]

export default function NavBar({ businessName }: { businessName: string }) {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-100 px-8 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="font-extrabold text-primary-dark text-lg shrink-0">
          {businessName}
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                pathname.startsWith(href)
                  ? 'bg-primary text-white'
                  : 'text-taupe hover:text-primary-dark hover:bg-cream'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <Link
        href="/settings"
        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
          pathname === '/settings'
            ? 'bg-primary text-white'
            : 'text-taupe hover:text-primary-dark hover:bg-cream'
        }`}
      >
        Settings
      </Link>
    </nav>
  )
}
