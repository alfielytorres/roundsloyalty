'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import Modal from '@/components/Modal'

export default function AddStaffModal({ vendorId }: { vendorId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-10 h-10 flex items-center justify-center bg-[#1D1D1F] hover:bg-black text-white rounded-full transition-colors shadow-sm"
        title="Add staff">
        <Plus size={20} />
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Add staff member">
        <form action="/api/staff/add" method="POST" className="flex flex-col gap-4">
          <input type="hidden" name="vendor_id" value={vendorId} />
          <div>
            <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Email address</label>
            <input type="email" name="email" required placeholder="staff@example.com" className="dark-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Role</label>
            <select name="role" className="dark-input w-full">
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setOpen(false)}
              className="flex-1 py-3 rounded-2xl border border-black/10 text-black/50 font-semibold text-sm hover:bg-black/5 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-3 rounded-2xl bg-[#1D1D1F] text-white font-semibold text-sm hover:bg-black transition-colors">
              Add member
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
