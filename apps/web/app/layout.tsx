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
  title: 'Rounds Loyalty — Vendor Portal',
  description: 'Manage your loyalty program and reward your customers',
  icons: { icon: '/logo.svg', apple: '/logo.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#0D1F0D] text-white antialiased tracking-tight">
        {children}
        <ConditionalNav />
      </body>
    </html>
  )
}
