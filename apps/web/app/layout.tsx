import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rounds Loyalty — Vendor Portal',
  description: 'Manage your loyalty program and reward your customers',
  icons: { icon: '/logo.svg', apple: '/logo.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0D1F0D] text-white antialiased">{children}</body>
    </html>
  )
}
