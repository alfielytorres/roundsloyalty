import { getPortalData } from '@/lib/portal-data'
import { LogOut } from 'lucide-react'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string }
}) {
  const { user, business } = await getPortalData()

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-1">{business.name}</p>
          <h1 className="text-3xl font-extrabold text-white">Settings</h1>
          <p className="text-white/50 mt-1">Update your business details</p>
        </div>

        {searchParams.error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-300 text-sm">{searchParams.error}</div>
        )}
        {searchParams.success && (
          <div className="mb-6 p-4 bg-[#7DB542]/20 border border-[#7DB542]/30 rounded-2xl text-[#D4EDBE] text-sm font-semibold">{searchParams.success}</div>
        )}

        <div className="glass-card p-6 mb-4">
          <h2 className="text-base font-bold text-white mb-5">Business details</h2>
          <form action="/api/settings" method="POST" className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Business name</label>
              <input name="name" required defaultValue={business.name ?? ''} className="w-full dark-input" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Description</label>
              <textarea name="description" rows={3} defaultValue={business.description ?? ''} placeholder="Tell customers what you do"
                className="w-full dark-input resize-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Address</label>
              <input name="address" defaultValue={business.address ?? ''} placeholder="123 Main St, City" className="w-full dark-input" />
            </div>
            <button type="submit" className="bg-[#7DB542] text-white font-bold px-6 py-2.5 rounded-2xl hover:opacity-90 transition-opacity self-start">
              Save changes
            </button>
          </form>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-base font-bold text-white mb-1">Account</h2>
          <p className="text-white/50 text-sm mb-4">{user.email}</p>
          <form action="/api/auth/sign-out" method="POST">
            <button type="submit" className="flex items-center gap-2 px-5 py-2 rounded-xl border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-colors">
              <LogOut size={14} />Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
