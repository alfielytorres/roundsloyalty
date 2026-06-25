import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { DM_Sans, Space_Grotesk } from 'next/font/google'
import './globals.css'
import ConditionalNav from '@/components/ConditionalNav'
import LayoutShell from '@/components/LayoutShell'
import { ToastProvider } from '@/components/Toast'
import UrlMessageToaster from '@/components/UrlMessageToaster'

// Body text + the distinctive display face used for headings and the wordmark.
const sans = DM_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' })

export const metadata: Metadata = {
  title: 'Rounds — Vendor Portal',
  description: 'Manage your loyalty program and reward your customers',
  appleWebApp: { capable: true, title: 'Rounds', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#1D1D1F',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`min-h-screen ${sans.variable} ${display.variable}`}>
      <body className="min-h-screen bg-black/5 text-[#1D1D1F] antialiased font-sans">
        <ToastProvider>
          <ConditionalNav />
          <LayoutShell>{children}</LayoutShell>
          <Suspense fallback={null}>
            <UrlMessageToaster />
          </Suspense>
        </ToastProvider>
      </body>
    </html>
  )
}
