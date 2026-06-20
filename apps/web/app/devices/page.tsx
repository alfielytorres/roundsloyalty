import { Suspense } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPortalData } from '@/lib/portal-data'
import { Cpu, WifiOff } from 'lucide-react'

interface Device {
  id: string
  name: string
  location_label: string | null
  status: string
  last_used_at: string | null
}

function DeviceStatusBadge({ status }: { status: string }) {
  const cls = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    paused: 'bg-black/5 text-black/50 border-black/10',
    revoked: 'bg-red-50 text-red-600 border-red-200',
  }[status] ?? 'bg-black/5 text-black/40 border-black/10'

  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

async function DeviceList({ vendorId }: { vendorId: string }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: devices } = await supabase
    .from('nfc_stamp_devices')
    .select('id, name, location_label, status, last_used_at')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })

  if (!devices?.length) {
    return (
      <div className="glass rounded-3xl px-6 py-12 text-center ">
        <Cpu className="mx-auto text-black/35 mb-3" size={36} />
        <p className="text-black/40 font-medium">No devices registered</p>
        <p className="text-black/35 text-sm mt-1">Register an NFC device to enable tap-to-stamp</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-3xl overflow-hidden ">
      <table className="w-full">
        <thead>
          <tr className="border-b border-black/5">
            {['Device', 'Location', 'Status', 'Last used', 'Actions'].map((h) => (
              <th key={h} className="text-left px-5 py-4 text-sm font-semibold text-black/35">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(devices as Device[]).map((d) => (
            <tr key={d.id} className="border-b border-black/5 hover:bg-black/5 transition-colors">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-black/5 flex items-center justify-center">
                    <Cpu size={16} className="text-black/40" />
                  </div>
                  <span className="font-semibold text-[#1D1D1F]">{d.name}</span>
                </div>
              </td>
              <td className="px-5 py-4 text-black/40 text-sm">{d.location_label ?? '—'}</td>
              <td className="px-5 py-4"><DeviceStatusBadge status={d.status} /></td>
              <td className="px-5 py-4 text-black/35 text-sm">
                {d.last_used_at ? new Date(d.last_used_at).toLocaleDateString() : 'Never'}
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  {d.status === 'active' && (
                    <form action="/api/devices/pause" method="POST" className="inline">
                      <input type="hidden" name="device_id" value={d.id} />
                      <button type="submit" className="text-xs font-semibold text-black/50 hover:text-black/70 px-2 py-1 rounded-lg hover:bg-black/5 transition-colors">
                        Pause
                      </button>
                    </form>
                  )}
                  {d.status === 'paused' && (
                    <form action="/api/devices/resume" method="POST" className="inline">
                      <input type="hidden" name="device_id" value={d.id} />
                      <button type="submit" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors">
                        Resume
                      </button>
                    </form>
                  )}
                  {d.status !== 'revoked' && (
                    <form action="/api/devices/revoke" method="POST" className="inline">
                      <input type="hidden" name="device_id" value={d.id} />
                      <button type="submit" className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                        Revoke
                      </button>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function DevicesPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { vendor } = await getPortalData()
  const query = await searchParams

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-black/35 text-xs font-semibold tracking-widest uppercase mb-1">{vendor.business_name}</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">NFC Devices</h1>
          <p className="text-black/40 mt-1">Manage tap-to-stamp NFC devices at your venue</p>
        </div>

        {query.error && <div className="mb-5 p-4 bg-black/5 border border-black/10 rounded-2xl text-black/60 text-sm">{query.error}</div>}
        {query.success && <div className="mb-5 p-4 bg-black/5 border border-black/15 rounded-2xl text-black/70 text-sm font-semibold">{query.success}</div>}

        {/* Register device form */}
        <div className="glass rounded-3xl p-6  mb-6">
          <h2 className="text-base font-bold text-[#1D1D1F] mb-5">Register new device</h2>
          <form action="/api/devices/register" method="POST" className="flex flex-col gap-4">
            <input type="hidden" name="vendor_id" value={vendor.id} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Device name</label>
                <input name="name" required placeholder="e.g. Counter A" className="w-full dark-input" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Location label</label>
                <input name="location_label" placeholder="e.g. Front counter" className="w-full dark-input" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Device token</label>
              <input name="device_token" required placeholder="Unique token from the NFC device" className="w-full dark-input font-mono text-sm" autoComplete="off" />
              <p className="text-black/35 text-xs mt-1">This will be hashed before storage. Keep it secret.</p>
            </div>
            <button type="submit" className="btn-primary self-start">Register device</button>
          </form>
        </div>

        <Suspense fallback={
          
          </div>
        }>
          <DeviceList vendorId={vendor.id} />
        </Suspense>
      </div>
    </main>
  )
}
