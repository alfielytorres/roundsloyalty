import Link from 'next/link'
import { getPortalData } from '@/lib/portal-data'
import { LogOut, Sparkles, ArrowRight } from 'lucide-react'
import AddressAutocomplete from './AddressAutocomplete'
import SubmitButton from '@/components/SubmitButton'
import LocationsManager from './LocationsManager'

export default async function SettingsPage() {
  const { user, vendor } = await getPortalData()

  return (
    <main className="px-5 pt-8 pb-32">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-black/25 uppercase mb-1">{vendor.business_name}</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Settings</h1>
        </div>

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
              <AddressAutocomplete
                defaultValue={vendor.address ?? ''}
                defaultLat={vendor.lat ?? undefined}
                defaultLng={vendor.lng ?? undefined}
              />
              <p className="text-black/30 text-xs mt-1">Your main contact address. Stores shown on the customer map are managed under Locations below.</p>
            </div>

            <SubmitButton pendingText="Saving…" className="btn-primary self-start text-sm py-2.5 px-5 mt-1 disabled:opacity-60">Save changes</SubmitButton>
          </form>
        </div>

        <LocationsManager vendorId={vendor.id} />

        <Link href="/setup" className="glass mb-3 flex items-center gap-3 hover:bg-white/90 transition-colors">
          <div className="w-10 h-10 rounded-2xl bg-rounds-soft flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-rounds" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#1D1D1F] text-sm">Setup guide</p>
            <p className="text-black/40 text-xs">Walk through setting up your store again</p>
          </div>
          <ArrowRight size={16} className="text-black/30 shrink-0" />
        </Link>

        <div className="glass">
          <p className="text-sm font-semibold text-[#1D1D1F] mb-0.5">Account</p>
          <p className="text-black/40 text-sm mb-3">{user.email}</p>
          <form action="/api/auth/sign-out" method="POST">
            <SubmitButton pendingText="Signing out…" className="flex items-center gap-1.5 text-sm font-medium text-black/50 border border-black/10 px-4 py-2 rounded-xl hover:bg-black/5 transition-colors disabled:opacity-60">
              <LogOut size={14} />Sign out
            </SubmitButton>
          </form>
        </div>
      </div>
    </main>
  )
}
