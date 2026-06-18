import { getPortalData } from '@/lib/portal-data'
import { LogOut } from 'lucide-react'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string }
}) {
  const { user, vendor } = await getPortalData()

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-1">{vendor.business_name}</p>
          <h1 className="text-3xl font-extrabold text-white">Settings</h1>
          <p className="text-white/50 mt-1">Manage your business details and program settings</p>
        </div>

        {searchParams.error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-300 text-sm">{searchParams.error}</div>
        )}
        {searchParams.success && (
          <div className="mb-6 p-4 bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 rounded-2xl text-white text-sm font-semibold">{searchParams.success}</div>
        )}

        <div className="glass-card p-6 mb-4">
          <h2 className="text-base font-bold text-white mb-5">Business details</h2>
          <form action="/api/settings" method="POST" className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Business name</label>
              <input name="business_name" required defaultValue={vendor.business_name ?? ''} className="w-full dark-input" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Description</label>
              <textarea name="description" rows={3} defaultValue={vendor.description ?? ''} placeholder="Tell customers what you do"
                className="w-full dark-input resize-none" />
            </div>
            <button type="submit" className="btn-primary self-start">
              Save changes
            </button>
          </form>
        </div>

        <div className="glass-card p-6 mb-4">
          <h2 className="text-base font-bold text-white mb-1">Proof of purchase</h2>
          <p className="text-white/50 text-sm mb-5">Let customers submit receipts to earn rewards when staff can't scan their card.</p>
          <form action="/api/settings/proof-of-purchase" method="POST" className="flex flex-col gap-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-semibold text-white">Enable proof of purchase</span>
              <input
                type="checkbox"
                name="enabled"
                value="true"
                defaultChecked={vendor.proof_of_purchase_enabled ?? false}
                className="w-5 h-5 rounded accent-[#8B5CF6]"
              />
            </label>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Instructions for customers</label>
              <textarea name="instructions" rows={3}
                defaultValue={vendor.proof_of_purchase_instructions ?? ''}
                placeholder="e.g. Upload a photo of your receipt showing the date and total amount."
                className="w-full dark-input resize-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Max claim age (days)</label>
              <input
                type="number"
                name="max_claim_age_days"
                min="1"
                max="365"
                defaultValue={vendor.proof_of_purchase_max_claim_age_days ?? 30}
                className="w-full dark-input"
              />
              <p className="text-white/40 text-xs mt-1.5">Receipts older than this many days will be rejected.</p>
            </div>
            <button type="submit" className="btn-primary self-start">
              Save proof of purchase settings
            </button>
          </form>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-base font-bold text-white mb-1">Account</h2>
          <p className="text-white/50 text-sm mb-4">{user.email}</p>
          <form action="/api/auth/sign-out" method="POST">
            <button type="submit" className="btn-danger flex items-center gap-2">
              <LogOut size={14} />Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
