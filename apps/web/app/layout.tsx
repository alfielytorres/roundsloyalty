import type { Metadata } from 'next'
import './globals.css'
import ConditionalNav from '@/components/ConditionalNav'

export const metadata: Metadata = {
  title: 'Rounds Loyalty — Vendor Portal',
  description: 'Manage your loyalty program and reward your customers',
  icons: { icon: '/logo.svg', apple: '/logo.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <ConditionalNav />
      </body>
    </html>
  )
}
