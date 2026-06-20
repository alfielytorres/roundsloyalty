'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Award } from 'lucide-react'
import BrandingEditor from '../settings/BrandingEditor'

interface Program {
  id: string
  name: string
  rounds_required: number
  reward_name: string
  reward_description: string | null
  reward_expiry_days: number | null
  default_round_value: number
  status: string
}

interface Vendor {
  id: string
  business_name: string
  logo_url: string | null
  brand_color: string | null
}

function InlineMsg({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
  if (!msg) return null
  return (
    <p className={`text-sm font-medium mt-3 ${msg.type === 'success' ? 'text-black/60' : 'text-red-500'}`}>
      {msg.type === 'success' ? '✓ ' : '⚠ '}{msg.text}
    </p>
  )
}

export default function ProgramsClient({
  vendor, initialProgram, canEdit,
}: {
  vendor: Vendor
  initialProgram: Program | null
  canEdit: boolean
}) {
  const [program, setProgram] = useState<Program | null>(initialProgram)
  const [saving, setSaving] = useState(false)
  const [brandSaving, setBrandSaving] = useState(false)
  const [progMsg, setProgMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [brandMsg, setBrandMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Keep program state fresh after save
  useEffect(() => { setProgram(initialProgram) }, [initialProgram])

  async function saveProgram(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setProgMsg(null)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/programs/upsert', { method: 'POST', body: fd })
    if (res.ok || res.redirected) {
      // Refresh program data
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data } = await supabase
        .from('loyalty_programs')
        .select('id, name, rounds_required, reward_name, reward_description, reward_expiry_days, default_round_value, status')
        .eq('vendor_id', vendor.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()
      setProgram(data as Program | null)
      setProgMsg({ type: 'success', text: 'Program saved!' })
    } else {
      setProgMsg({ type: 'error', text: 'Failed to save. Please try again.' })
    }
    setSaving(false)
  }

  async function saveBranding(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBrandSaving(true)
    setBrandMsg(null)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/settings', { method: 'POST', body: fd })
    if (res.ok || res.redirected) {
      setBrandMsg({ type: 'success', text: 'Branding saved!' })
    } else {
      setBrandMsg({ type: 'error', text: 'Failed to save branding.' })
    }
    setBrandSaving(false)
  }

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-1">{vendor.business_name}</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Program</h1>
          <p className="text-black/40 mt-1">Manage your loyalty program and reward structure</p>
        </div>

        {/* Program settings */}
        <div className="glass rounded-3xl p-6 mb-4">
          {!program ? (
            canEdit ? (
              <>
                <div className="text-center mb-8">
                  <Award className="mx-auto text-black/20 mb-3" size={36} />
                  <h3 className="text-[#1D1D1F] font-bold text-lg mb-1">Set up your loyalty program</h3>
                  <p className="text-black/35 text-sm">Define how customers earn rounds and what reward they get</p>
                </div>
                <form ref={formRef} onSubmit={saveProgram} className="flex flex-col gap-4">
                  <input type="hidden" name="vendor_id" value={vendor.id} />
                  <div>
                    <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Program name</label>
                    <input name="name" required placeholder="e.g. Coffee Club" className="dark-input w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Rounds to earn reward</label>
                      <input type="number" name="rounds_required" min="1" max="200" required defaultValue={10} className="dark-input w-full" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Rounds per scan</label>
                      <input type="number" name="default_round_value" min="1" max="5" required defaultValue={1} className="dark-input w-full" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Reward name</label>
                    <input name="reward_name" required placeholder="e.g. Free Coffee" className="dark-input w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Reward description (optional)</label>
                    <textarea name="reward_description" rows={2} placeholder="Describe what customers get" className="dark-input w-full resize-none" />
                  </div>
                  <button type="submit" disabled={saving}
                    className="w-full py-3 rounded-2xl bg-[#1D1D1F] text-white font-semibold text-sm hover:bg-black transition-colors mt-2 disabled:opacity-50">
                    {saving ? 'Creating…' : 'Create program'}
                  </button>
                  <InlineMsg msg={progMsg} />
                </form>
              </>
            ) : (
              <div className="text-center py-10">
                <Award className="mx-auto text-black/35 mb-4" size={40} />
                <h3 className="text-[#1D1D1F] font-semibold mb-2">No program yet</h3>
                <p className="text-black/35 text-sm">Contact your manager to set up a loyalty program.</p>
              </div>
            )
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs font-bold bg-[#1D1D1F] text-white px-2.5 py-1 rounded-full">Active</span>
                <h2 className="text-lg font-bold text-[#1D1D1F]">{program.name}</h2>
              </div>

              {canEdit ? (
                <form onSubmit={saveProgram} className="flex flex-col gap-5">
                  <input type="hidden" name="program_id" value={program.id} />
                  <input type="hidden" name="vendor_id" value={vendor.id} />
                  <div>
                    <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Program name</label>
                    <input name="name" required defaultValue={program.name} className="w-full dark-input" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Rounds required</label>
                      <input type="number" name="rounds_required" min="1" max="200" required defaultValue={program.rounds_required} className="w-full dark-input" />
                      <p className="text-black/35 text-xs mt-1">Rounds needed to earn reward</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Default round value</label>
                      <input type="number" name="default_round_value" min="1" max="5" required defaultValue={program.default_round_value} className="w-full dark-input" />
                      <p className="text-black/35 text-xs mt-1">Rounds per scan</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Reward name</label>
                    <input name="reward_name" required defaultValue={program.reward_name} className="w-full dark-input" placeholder="e.g. Free Coffee" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Reward description</label>
                    <textarea name="reward_description" rows={3} defaultValue={program.reward_description ?? ''} placeholder="Describe the reward for customers" className="w-full dark-input resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Reward expiry (days)</label>
                    <input type="number" name="reward_expiry_days" min="1" max="365" defaultValue={program.reward_expiry_days ?? 30} className="w-full dark-input" />
                    <p className="text-black/35 text-xs mt-1">Days until an unlocked reward expires</p>
                  </div>
                  <button type="submit" disabled={saving}
                    className="btn-primary self-start disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                  <InlineMsg msg={progMsg} />
                </form>
              ) : (
                <div className="flex flex-col gap-4 text-sm">
                  {[
                    ['Rounds required', String(program.rounds_required)],
                    ['Default round value', String(program.default_round_value)],
                    ['Reward', program.reward_name],
                    ...(program.reward_description ? [['Description', program.reward_description]] : []),
                    ...(program.reward_expiry_days ? [['Expiry', `${program.reward_expiry_days} days`]] : []),
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-start gap-4 py-2 border-b border-black/5 last:border-0">
                      <span className="text-black/40 font-medium shrink-0">{label}</span>
                      <span className="text-[#1D1D1F] font-semibold text-right">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Branding — logo, colour, iOS preview */}
        {canEdit && (
          <div className="glass rounded-3xl p-6">
            <h2 className="text-base font-bold text-[#1D1D1F] mb-5">Branding &amp; loyalty card</h2>
            <form onSubmit={saveBranding} className="flex flex-col gap-4">
              {/* Hidden fields the settings API needs */}
              <input type="hidden" name="business_name" value={vendor.business_name} />
              <BrandingEditor
                defaultLogoUrl={vendor.logo_url ?? ''}
                defaultBrandColor={vendor.brand_color ?? '#1D1D1F'}
                vendorName={vendor.business_name}
                rewardName={program?.reward_name ?? 'Free item'}
                roundsRequired={program?.rounds_required ?? 10}
              />
              <button type="submit" disabled={brandSaving}
                className="btn-primary self-start mt-1 disabled:opacity-50">
                {brandSaving ? 'Saving…' : 'Save branding'}
              </button>
              <InlineMsg msg={brandMsg} />
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
