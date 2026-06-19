import { getPortalData } from '@/lib/portal-data'
import { LogOut, QrCode } from 'lucide-react'
import Link from 'next/link'

export default async function SettingsPage({ searchParams }: { searchParams: { error?: string; success?: string } }) {
  const { user, vendor } = await getPortalData()

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-lg mx-auto">
        <div className="mb-7">
          <p className="text-[#9CA3AF] text-xs font-semibold tracking-widest uppercase mb-0.5">{vendor.business_name}</p>
          <h1 className="text-3xl font-extrabold text-[#111111]">Settings</h1>
          <p className="text-[#6B7280] mt-1">Manage your business details and program settings</p>
        </div>

        {searchParams.error && <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">{searchParams.error}</div>}
        {searchParams.success && <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm font-semibold">{searchParams.success}</div>}

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
            <button type="submit" className="btn-primary self-start">Save changes</button>
          </form>
        </div>

        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-6 mb-4 shadow-sm">
          <h2 className="text-base font-bold text-[#111111] mb-1">Proof of purchase</h2>
          <p className="text-[#6B7280] text-sm mb-5">Let customers submit receipts to earn rewards when staff can&apos;t scan their card.</p>
          <form action="/api/settings/proof-of-purchase" method="POST" className="flex flex-col gap-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-semibold text-[#374151]">Enable proof of purchase</span>
              <input type="checkbox" name="enabled" value="true" defaultChecked={vendor.proof_of_purchase_enabled ?? false} className="w-5 h-5 rounded accent-[#16A34A]" />
            </label>
            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">Instructions for customers</label>
              <textarea name="instructions" rows={3} defaultValue={vendor.proof_of_purchase_instructions ?? ''} placeholder="e.g. Upload a photo of your receipt." className="w-full dark-input resize-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">Max claim age (days)</label>
              <input type="number" name="max_claim_age_days" min="1" max="365" defaultValue={vendor.proof_of_purchase_max_claim_age_days ?? 30} className="w-full dark-input" />
              <p className="text-[#9CA3AF] text-xs mt-1.5">Receipts older than this many days will be rejected.</p>
            </div>
            <button type="submit" className="btn-primary self-start">Save settings</button>
          </form>
        </div>

        <Link href="/qr" className="flex items-center gap-4 bg-[#16A34A] rounded-3xl p-5 mb-4 hover:bg-[#15803D] transition-colors">
          <div className="w-10 h-10 rounded-2xl bg-white/25 flex items-center justify-center shrink-0">
            <QrCode size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white">My QR Code</h2>
            <p className="text-white/80 text-sm">Show this to customers so they can scan and earn stamps</p>
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
