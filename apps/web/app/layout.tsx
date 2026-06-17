import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rounds Loyalty — Vendor Portal',
  description: 'Manage your loyalty program and reward your customers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-cream text-forest-dark antialiased">{children}</body>
    </html>
  )
}
