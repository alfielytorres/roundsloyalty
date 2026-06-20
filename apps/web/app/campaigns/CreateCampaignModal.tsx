'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import Modal from '@/components/Modal'

export default function CreateCampaignModal({ vendorId }: { vendorId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-10 h-10 flex items-center justify-center bg-[#1D1D1F] hover:bg-black text-white rounded-full transition-colors shadow-sm"
        title="New campaign">
        <Plus size={20} />
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Create campaign">
        <form action="/api/campaigns/create" method="POST" className="flex flex-col gap-4">
          <input type="hidden" name="vendor_id" value={vendorId} />

          <div>
            <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Campaign name</label>
            <input name="name" required placeholder="e.g. Double Round Weekend" className="dark-input w-full" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Round value (per scan)</label>
            <input type="number" name="round_value" min="2" max="10" required defaultValue={2} className="dark-input w-full" />
            <p className="text-black/30 text-xs mt-1.5">Must be between 2 and your program&apos;s max round value</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Start</label>
              <input type="datetime-local" name="starts_at" required className="dark-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">End</label>
              <input type="datetime-local" name="ends_at" required className="dark-input w-full" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Customer message (optional)</label>
            <textarea name="customer_message" rows={2} placeholder="Message shown to customers during the campaign" className="dark-input w-full resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setOpen(false)}
              className="flex-1 py-3 rounded-2xl border border-black/10 text-black/50 font-semibold text-sm hover:bg-black/5 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-3 rounded-2xl bg-[#1D1D1F] text-white font-semibold text-sm hover:bg-black transition-colors">
              Create
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
