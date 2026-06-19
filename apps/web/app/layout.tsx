import type { Metadata } from 'next'
import './globals.css'
import ConditionalNav from '@/components/ConditionalNav'
import LayoutShell from '@/components/LayoutShell'

export const metadata: Metadata = {
  title: 'Rounds Loyalty — Vendor Portal',
  description: 'Manage your loyalty program and reward your customers',
  icons: { icon: '/logo.svg', apple: '/logo.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#F8F5F1] text-[#111111] antialiased">
        <ConditionalNav />
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  )
}
