'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import Modal from '@/components/Modal'

export default function RegisterDeviceModal({ vendorId }: { vendorId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-10 h-10 flex items-center justify-center bg-[#1D1D1F] hover:bg-black text-white rounded-full transition-colors shadow-sm"
        title="Add device">
        <Plus size={20} />
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Register NFC device">
        <form action="/api/devices/register" method="POST" className="flex flex-col gap-4">
          <input type="hidden" name="vendor_id" value={vendorId} />
          <div>
            <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Device name</label>
            <input name="name" required placeholder="e.g. Counter A" className="dark-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Location label</label>
            <input name="location_label" placeholder="e.g. Front counter" className="dark-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Device token</label>
            <input name="device_token" required placeholder="Unique token from the NFC device" className="dark-input w-full font-mono text-sm" autoComplete="off" />
            <p className="text-black/30 text-xs mt-1.5">This will be hashed before storage. Keep it secret.</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setOpen(false)}
              className="flex-1 py-3 rounded-2xl border border-black/10 text-black/50 font-semibold text-sm hover:bg-black/5 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-3 rounded-2xl bg-[#1D1D1F] text-white font-semibold text-sm hover:bg-black transition-colors">
              Register
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
