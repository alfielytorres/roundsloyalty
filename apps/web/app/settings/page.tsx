import { getPortalData } from '@/lib/portal-data'
import { LogOut, QrCode } from 'lucide-react'
import Link from 'next/link'

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { user, vendor } = await getPortalData()
  const query = await searchParams

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-lg mx-auto">
        <div className="mb-7">
          <p className="text-[#9CA3AF] text-xs font-semibold tracking-widest uppercase mb-0.5">{vendor.business_name}</p>
          <h1 className="text-3xl font-extrabold text-[#111111]">Settings</h1>
          <p className="text-[#6B7280] mt-1">Manage your business details and branding</p>
        </div>

        {query.error && <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">{query.error}</div>}
        {query.success && <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm font-semibold">{query.success}</div>}

        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-6 mb-4 shadow-sm">
          <h2 className="text-base font-bold text-[#111111] mb-5">Business details</h2>
          <form action="/api/settings" method="POST" className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">Business name</label>
              <input name="business_name" required defaultValue={vendor.business_name ?? ''} className="w-full dark-input" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">Description</label>
              <textarea name="description" rows={3} defaultValue={vendor.description ?? ''} placeholder="Tell customers what you do" className="w-full dark-input resize-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">Category</label>
              <input name="category" defaultValue={vendor.category ?? ''} placeholder="e.g. Cafe, Restaurant, Retail" className="w-full dark-input" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">Address</label>
              <input name="address" defaultValue={vendor.address ?? ''} placeholder="123 Main St, City" className="w-full dark-input" />
              <p className="text-[#9CA3AF] text-xs mt-1.5">Customers will see your location on the map in the app.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">Logo URL</label>
              <input name="logo_url" type="url" defaultValue={vendor.logo_url ?? ''} placeholder="https://..." className="w-full dark-input" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">Brand colour</label>
              <div className="flex items-center gap-3">
                <input type="color" name="brand_color" defaultValue={vendor.brand_color ?? '#E8805A'} className="w-12 h-10 rounded-xl border border-[#E8E2D9] cursor-pointer p-1" />
                <input name="brand_color_text" defaultValue={vendor.brand_color ?? '#E8805A'} placeholder="#E8805A" className="flex-1 dark-input" />
              </div>
              <p className="text-[#9CA3AF] text-xs mt-1.5">Used as the accent colour in your loyalty card.</p>
            </div>
            <button type="submit" className="btn-primary self-start">Save changes</button>
          </form>
        </div>

        <Link href="/qr" className="flex items-center gap-4 bg-[#E8805A] rounded-3xl p-5 mb-4 hover:bg-[#d4714e] transition-colors">
          <div className="w-10 h-10 rounded-2xl bg-white/25 flex items-center justify-center shrink-0">
            <QrCode size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white">My QR Code</h2>
            <p className="text-white/80 text-sm">Show this to customers so they can join your loyalty program</p>
          </div>
        </Link>

        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-[#111111] mb-1">Account</h2>
          <p className="text-[#6B7280] text-sm mb-4">{user.email}</p>
          <form action="/api/auth/sign-out" method="POST">
            <button type="submit" className="btn-danger flex items-center gap-2"><LogOut size={14} />Sign out</button>
          </form>
        </div>
      </div>
    </main>
  )
}
