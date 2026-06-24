'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Cpu, Pencil } from 'lucide-react'
import Modal from '@/components/Modal'

interface Device {
  id: string
  name: string
  location_label: string | null
  status: string
  last_used_at: string | null
}

const statusBadge: Record<string, string> = {
  active: 'bg-black/10 text-[#1D1D1F] border-black/15',
  paused: 'bg-black/5 text-black/50 border-black/10',
  revoked: 'bg-black/5 text-black/30 border-black/5',
}

export default function DevicesClient({
  vendorId, vendorName, RegisterDeviceModal,
}: {
  vendorId: string
  vendorName: string
  RegisterDeviceModal: React.ReactNode
}) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [selected, setSelected] = useState<Device | null>(null)
  const [editName, setEditName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    supabase
      .from('nfc_stamp_devices')
      .select('id, name, location_label, status, last_used_at')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setDevices((data ?? []) as Device[]); setLoading(false) })
  }, [vendorId])

  useEffect(() => { load() }, [load])

  function openDevice(d: Device) {
    setSelected(d)
    setEditName(d.name)
    setEditLocation(d.location_label ?? '')
    setSaveError(null)
  }

  async function deviceAction(path: string, deviceId: string) {
    setBusy(deviceId)
    const nextStatus = path.includes('pause') ? 'paused' : path.includes('resume') ? 'active' : 'revoked'
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status: nextStatus } : d))
    setSelected(prev => prev && prev.id === deviceId ? { ...prev, status: nextStatus } : prev)
    await fetch(path, {
      method: 'POST',
      body: new URLSearchParams({ device_id: deviceId }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    })
    setBusy(null)
    load()
  }

  async function saveDevice() {
    if (!selected) return
    const name = editName.trim()
    if (!name) { setSaveError('Name is required.'); return }
    setBusy(selected.id)
    setSaveError(null)
    const body = new FormData()
    body.set('device_id', selected.id)
    body.set('name', name)
    body.set('location_label', editLocation.trim())
    const res = await fetch('/api/devices/update', { method: 'POST', body })
    setBusy(null)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setSaveError(j.error ?? 'Could not save changes.')
      return
    }
    setDevices(prev => prev.map(d => d.id === selected.id ? { ...d, name, location_label: editLocation.trim() || null } : d))
    setSelected(null)
    load()
  }

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-7">
          <div>
            <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-0.5">{vendorName}</p>
            <h1 className="text-2xl font-bold text-[#1D1D1F]">NFC Devices</h1>
            <p className="text-black/40 text-sm mt-0.5">Manage tap-to-stamp devices at your venue</p>
          </div>
          <div className="mt-1">{RegisterDeviceModal}</div>
        </div>

        {loading ? (
          <div className="glass px-6 py-14 flex justify-center">
            <div className="w-5 h-5 border-2 border-black/15 border-t-black/50 rounded-full animate-spin" />
          </div>
        ) : devices.length === 0 ? (
          <div className="glass px-6 py-14 text-center">
            <Cpu className="mx-auto text-black/20 mb-3" size={36} />
            <p className="text-black/40 font-medium">No devices registered</p>
            <p className="text-black/30 text-sm mt-1">Register an NFC device to enable tap-to-stamp</p>
          </div>
        ) : (
          <div className="glass overflow-hidden">
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/5 bg-black/[0.02]">
                    {['Device', 'Location', 'Status', 'Last used', ''].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-black/35 tracking-widest uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {devices.map(d => (
                    <tr key={d.id} onClick={() => openDevice(d)}
                      className="hover:bg-black/[0.03] transition-colors group cursor-pointer">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center shrink-0">
                            <Cpu size={14} className="text-black/40" />
                          </div>
                          <span className="font-semibold text-[#1D1D1F] text-sm">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-black/40 text-sm">{d.location_label ?? '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusBadge[d.status] ?? 'bg-black/5 text-black/40 border-black/5'}`}>
                          {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-black/35 text-sm">
                        {d.last_used_at ? new Date(d.last_used_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-black/30 group-hover:text-black/60 transition-colors">
                          <Pencil size={12} /> Edit
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-black/5">
              {devices.map(d => (
                <button key={d.id} onClick={() => openDevice(d)} className="w-full text-left px-5 py-4 active:bg-black/[0.03] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center">
                        <Cpu size={14} className="text-black/40" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#1D1D1F] text-sm">{d.name}</p>
                        <p className="text-black/35 text-xs">{d.location_label ?? 'No location'}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusBadge[d.status] ?? 'bg-black/5 text-black/40 border-black/5'}`}>
                      {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Device details">
        {selected && (
          <div className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-semibold text-black/45 tracking-wide uppercase mb-1.5">Device name</label>
              <input value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-white text-[#1D1D1F] text-sm focus:outline-none focus:border-black/30 transition-colors"
                placeholder="Front counter tag" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-black/45 tracking-wide uppercase mb-1.5">Location <span className="text-black/25 normal-case font-normal">(optional)</span></label>
              <input value={editLocation} onChange={e => setEditLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-white text-[#1D1D1F] text-sm focus:outline-none focus:border-black/30 transition-colors"
                placeholder="By the register" />
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-black/45">Status</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusBadge[selected.status] ?? 'bg-black/5 text-black/40 border-black/5'}`}>
                {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
              </span>
              <span className="ml-auto text-black/35 text-xs">
                Last used {selected.last_used_at ? new Date(selected.last_used_at).toLocaleDateString() : 'never'}
              </span>
            </div>

            {saveError && <p className="text-sm font-medium text-red-500">{saveError}</p>}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {selected.status === 'active' && (
                <button disabled={busy === selected.id} onClick={() => deviceAction('/api/devices/pause', selected.id)}
                  className="text-sm font-semibold text-black/60 px-3.5 py-2 rounded-xl border border-black/10 hover:bg-black/5 transition-colors disabled:opacity-40">
                  Pause
                </button>
              )}
              {selected.status === 'paused' && (
                <button disabled={busy === selected.id} onClick={() => deviceAction('/api/devices/resume', selected.id)}
                  className="text-sm font-semibold text-[#1D1D1F] px-3.5 py-2 rounded-xl border border-black/10 hover:bg-black/5 transition-colors disabled:opacity-40">
                  Resume
                </button>
              )}
              {selected.status !== 'revoked' && (
                <button disabled={busy === selected.id} onClick={() => deviceAction('/api/devices/revoke', selected.id)}
                  className="text-sm font-semibold text-red-500/80 px-3.5 py-2 rounded-xl border border-red-500/15 hover:bg-red-500/5 transition-colors disabled:opacity-40">
                  Revoke
                </button>
              )}
              <button disabled={busy === selected.id} onClick={saveDevice}
                className="ml-auto text-sm font-bold text-white bg-[#1D1D1F] px-5 py-2 rounded-xl hover:bg-black transition-colors disabled:opacity-40">
                Save changes
              </button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  )
}
