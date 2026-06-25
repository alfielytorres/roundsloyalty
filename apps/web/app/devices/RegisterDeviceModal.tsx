'use client'

import { useState, type FormEvent } from 'react'
import { Plus, Copy, Check } from 'lucide-react'
import Modal from '@/components/Modal'
import Spinner from '@/components/Spinner'

export default function RegisterDeviceModal({ vendorId }: { vendorId: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagUrl, setTagUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function reset() {
    setName('')
    setLocation('')
    setError(null)
    setTagUrl(null)
    setCopied(false)
    setSubmitting(false)
  }

  function close() {
    setOpen(false)
    // The device list is fetched client-side, so reload to surface the new device.
    if (tagUrl) {
      window.location.reload()
      return
    }
    reset()
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, name, location_label: location }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? 'Something went wrong.')
      } else {
        setTagUrl(data.tag_url)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function copyUrl() {
    if (!tagUrl) return
    await navigator.clipboard.writeText(tagUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-10 h-10 flex items-center justify-center bg-rounds hover:bg-rounds-hover text-white rounded-full transition-colors shadow-sm"
        title="Add device">
        <Plus size={20} />
      </button>

      <Modal isOpen={open} onClose={close} title={tagUrl ? 'Write your NFC tag' : 'Register NFC device'}>
        {tagUrl ? (
          <div className="flex flex-col gap-4">
            <p className="text-black/50 text-sm">
              Device registered. Write this URL to a blank NFC tag with a tag-writing app
              (e.g. <span className="font-semibold">NFC Tools</span>), then tap that tag on a
              customer&apos;s phone to stamp them.
            </p>
            <div className="flex items-center gap-2 p-3 bg-black/5 border border-black/10 rounded-2xl">
              <code className="flex-1 text-xs font-mono text-black/70 break-all">{tagUrl}</code>
              <button onClick={copyUrl}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-[#1D1D1F] text-white hover:bg-black transition-colors"
                title="Copy URL">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-black/30 text-xs">
              Shown only once — we store a hash, not the token. Register a new device any time if you lose it.
            </p>
            <button onClick={close}
              className="w-full py-3 rounded-2xl bg-rounds text-white font-semibold text-sm hover:bg-rounds-hover transition-colors">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Device name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Counter A" className="dark-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-black/40 tracking-widest uppercase mb-2">Location label</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Front counter" className="dark-input w-full" />
            </div>
            <p className="text-black/30 text-xs">
              We&apos;ll generate a secure token and the exact URL to write to your tag.
            </p>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={close}
                className="flex-1 py-3 rounded-2xl border border-black/10 text-black/50 font-semibold text-sm hover:bg-black/5 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-rounds text-white font-semibold text-sm hover:bg-rounds-hover transition-colors disabled:opacity-50">
                {submitting ? <><Spinner />Registering…</> : 'Register'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
