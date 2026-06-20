import type { Metadata } from 'next'
import './globals.css'
import ConditionalNav from '@/components/ConditionalNav'
import LayoutShell from '@/components/LayoutShell'

export const metadata: Metadata = {
  title: 'Round Rewards — Vendor Portal',
  description: 'Manage your loyalty program and reward your customers',
  icons: { icon: '/logo.svg', apple: '/logo.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black/5 text-[#1D1D1F] antialiased">
        <ConditionalNav />
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  )
}
