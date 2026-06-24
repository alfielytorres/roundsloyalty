import type { Metadata, Viewport } from 'next'
import './globals.css'
import ConditionalNav from '@/components/ConditionalNav'
import LayoutShell from '@/components/LayoutShell'

export const metadata: Metadata = {
  title: 'Rounds — Vendor Portal',
  description: 'Manage your loyalty program and reward your customers',
  appleWebApp: { capable: true, title: 'Rounds', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#E60128',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="min-h-screen">
      <body className="min-h-screen bg-black/5 text-[#1D1D1F] antialiased">
        <ConditionalNav />
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  )
}
