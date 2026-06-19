import { getPortalData } from '@/lib/portal-data'
import { LogOut, QrCode } from 'lucide-react'
import Link from 'next/link'

export default async function SettingsPage({ searchParams }: { searchParams: { error?: string; success?: string } }) {
  const { user, vendor } = await getPortalData()

  return (
    <main className="px-5 pt-8 pb-32">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-black/25 uppercase mb-1">{vendor.business_name}</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Settings</h1>
        </div>

        {searchParams.error && <div className="mb-4 p-3 bg-black/5 border border-black/10 rounded-2xl text-black/60 text-sm">{searchParams.error}</div>}
        {searchParams.success && <div className="mb-4 p-3 bg-black/5 border border-black/10 rounded-2xl text-black/70 text-sm font-semibold">{searchParams.success}</div>}

        <div className="glass mb-3">
          <h2 className="text-sm font-semibold text-[#1D1D1F] mb-4">Business details</h2>
          <form action="/api/settings" method="POST" className="flex flex-col gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Business name</label>
              <input name="business_name" required defaultValue={vendor.business_name ?? ''} className="w-full dark-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Description</label>
              <textarea name="description" rows={2} defaultValue={vendor.description ?? ''} placeholder="Tell customers what you do" className="w-full dark-input resize-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Category</label>
              <input name="category" defaultValue={vendor.category ?? ''} placeholder="e.g. Cafe, Restaurant, Retail" className="w-full dark-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Address</label>
              <input name="address" defaultValue={vendor.address ?? ''} placeholder="123 Main St, City" className="w-full dark-input" />
              <p className="text-black/30 text-xs mt-1">Shown on the map in the customer app.</p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Logo URL</label>
              <input name="logo_url" type="url" defaultValue={vendor.logo_url ?? ''} placeholder="https://..." className="w-full dark-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Brand colour</label>
              <div className="flex items-center gap-2">
                <input type="color" name="brand_color" defaultValue={vendor.brand_color ?? '#1D1D1F'} className="w-10 h-10 rounded-xl border border-black/10 cursor-pointer p-1 bg-white" />
                <input name="brand_color_text" defaultValue={vendor.brand_color ?? '#1D1D1F'} placeholder="#1D1D1F" className="flex-1 dark-input" />
              </div>
            </div>
            <button type="submit" className="btn-primary self-start text-sm py-2.5 px-5">Save changes</button>
          </form>
        </div>

        <Link href="/qr" className="glass flex items-center gap-3 mb-3 hover:bg-white/90 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-black/5 flex items-center justify-center shrink-0">
            <QrCode size={17} className="text-black/50" />
          </div>
          <div>
            <p className="font-semibold text-[#1D1D1F] text-sm">My QR Code</p>
            <p className="text-black/40 text-xs">Show customers to join your loyalty program</p>
          </div>
        </Link>

        <div className="glass">
          <p className="text-sm font-semibold text-[#1D1D1F] mb-0.5">Account</p>
          <p className="text-black/40 text-sm mb-3">{user.email}</p>
          <form action="/api/auth/sign-out" method="POST">
            <button type="submit" className="flex items-center gap-1.5 text-sm font-medium text-black/50 border border-black/10 px-4 py-2 rounded-xl hover:bg-black/5 transition-colors">
              <LogOut size={14} />Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
