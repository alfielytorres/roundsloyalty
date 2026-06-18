import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import ConditionalNav from '@/components/ConditionalNav'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Rounds — Vendor Portal',
  description: 'Launch a loyalty program without building an app.',
  icons: { icon: '/logo.svg', apple: '/logo.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#090B12] text-[#F8FAFC] antialiased tracking-tight">
        {children}
        <ConditionalNav />
      </body>
    </html>
  )
}
