'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Cpu } from 'lucide-react'

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

  async function deviceAction(path: string, deviceId: string) {
    setBusy(deviceId)
    // Optimistic update
    const nextStatus = path.includes('pause') ? 'paused' : path.includes('resume') ? 'active' : 'revoked'
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status: nextStatus } : d))
    await fetch(path, {
      method: 'POST',
      body: new URLSearchParams({ device_id: deviceId }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    })
    setBusy(null)
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
                    <tr key={d.id} className="hover:bg-black/[0.02] transition-colors group">
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
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {d.status === 'active' && (
                            <button disabled={busy === d.id} onClick={() => deviceAction('/api/devices/pause', d.id)}
                              className="text-xs font-semibold text-black/50 hover:text-black/80 px-3 py-1.5 rounded-xl hover:bg-black/5 transition-colors disabled:opacity-40">
                              Pause
                            </button>
                          )}
                          {d.status === 'paused' && (
                            <button disabled={busy === d.id} onClick={() => deviceAction('/api/devices/resume', d.id)}
                              className="text-xs font-semibold text-black/70 hover:text-black px-3 py-1.5 rounded-xl hover:bg-black/5 transition-colors disabled:opacity-40">
                              Resume
                            </button>
                          )}
                          {d.status !== 'revoked' && (
                            <button disabled={busy === d.id} onClick={() => deviceAction('/api/devices/revoke', d.id)}
                              className="text-xs font-semibold text-black/30 hover:text-black/60 px-3 py-1.5 rounded-xl hover:bg-black/5 transition-colors disabled:opacity-40">
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-black/5">
              {devices.map(d => (
                <div key={d.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
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
                  <div className="flex items-center gap-2 mt-3">
                    {d.status === 'active' && (
                      <button disabled={busy === d.id} onClick={() => deviceAction('/api/devices/pause', d.id)}
                        className="text-xs font-semibold text-black/50 px-3 py-1.5 rounded-xl border border-black/10 hover:bg-black/5 transition-colors disabled:opacity-40">
                        Pause
                      </button>
                    )}
                    {d.status === 'paused' && (
                      <button disabled={busy === d.id} onClick={() => deviceAction('/api/devices/resume', d.id)}
                        className="text-xs font-semibold text-black/70 px-3 py-1.5 rounded-xl border border-black/10 hover:bg-black/5 transition-colors disabled:opacity-40">
                        Resume
                      </button>
                    )}
                    {d.status !== 'revoked' && (
                      <button disabled={busy === d.id} onClick={() => deviceAction('/api/devices/revoke', d.id)}
                        className="text-xs font-semibold text-black/30 px-3 py-1.5 rounded-xl border border-black/5 hover:bg-black/5 transition-colors disabled:opacity-40">
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
