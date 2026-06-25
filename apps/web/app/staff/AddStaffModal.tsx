'use client'

import { useState } from 'react'
import { Plus, Shield, User, Check } from 'lucide-react'
import Modal from '@/components/Modal'
import SubmitButton from '@/components/SubmitButton'

const ROLES = [
  { value: 'staff' as const, icon: User, title: 'Staff', desc: 'Award rounds & handle collections' },
  { value: 'manager' as const, icon: Shield, title: 'Manager', desc: 'Full access — programs, campaigns & staff' },
]

export default function AddStaffModal({ vendorId }: { vendorId: string }) {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<'staff' | 'manager'>('staff')

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-10 h-10 flex items-center justify-center bg-rounds hover:bg-rounds-hover text-white rounded-full transition-colors shadow-sm"
        title="Add staff">
        <Plus size={20} />
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Add staff member">
        <form action="/api/staff/add" method="POST" className="flex flex-col gap-4">
          <input type="hidden" name="vendor_id" value={vendorId} />
          <input type="hidden" name="role" value={role} />

          <div>
            <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Email address</label>
            <input type="email" name="email" required placeholder="staff@example.com" className="dark-input w-full" />
            <p className="text-black/30 text-xs mt-1.5">They&apos;ll get access once they sign in with this email.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Role</label>
            <div className="grid grid-cols-2 gap-2.5">
              {ROLES.map(r => {
                const active = role === r.value
                return (
                  <button key={r.value} type="button" onClick={() => setRole(r.value)}
                    className={`text-left p-3.5 rounded-2xl border-2 transition-all ${active ? 'border-[#1D1D1F] bg-black/[0.03]' : 'border-black/10 hover:border-black/20'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <r.icon size={18} className={active ? 'text-[#1D1D1F]' : 'text-black/40'} />
                      {active && <Check size={15} className="text-[#1D1D1F]" />}
                    </div>
                    <p className="font-bold text-[#1D1D1F] text-sm">{r.title}</p>
                    <p className="text-black/40 text-xs mt-0.5 leading-snug">{r.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setOpen(false)}
              className="flex-1 py-3 rounded-2xl border border-black/10 text-black/50 font-semibold text-sm hover:bg-black/5 transition-colors">
              Cancel
            </button>
            <SubmitButton pendingText="Adding…"
              className="flex-1 py-3 rounded-2xl bg-rounds text-white font-semibold text-sm hover:bg-rounds-hover transition-colors disabled:opacity-60">
              Add member
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  )
}
