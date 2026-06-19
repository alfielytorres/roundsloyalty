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
    paused: 'bg-amber-50 text-amber-700 border-amber-200',
    revoked: 'bg-red-50 text-red-600 border-red-200',
  }[status] ?? 'bg-gray-100 text-gray-500 border-gray-200'

  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

async function DeviceList({ vendorId }: { vendorId: string }) {
  const cookieStore = cookies()
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
      <div className="bg-white border border-[#E8E2D9] rounded-3xl px-6 py-12 text-center shadow-sm">
        <Cpu className="mx-auto text-[#9CA3AF] mb-3" size={36} />
        <p className="text-[#6B7280] font-medium">No devices registered</p>
        <p className="text-[#9CA3AF] text-sm mt-1">Register an NFC device to enable tap-to-stamp</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#E8E2D9] rounded-3xl overflow-hidden shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#F0EDE6]">
            {['Device', 'Location', 'Status', 'Last used', 'Actions'].map((h) => (
              <th key={h} className="text-left px-5 py-4 text-sm font-semibold text-[#9CA3AF]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(devices as Device[]).map((d) => (
            <tr key={d.id} className="border-b border-[#F8F5F1] hover:bg-[#FAFAF8] transition-colors">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F0EDE6] flex items-center justify-center">
                    <Cpu size={16} className="text-[#6B7280]" />
                  </div>
                  <span className="font-semibold text-[#111111]">{d.name}</span>
                </div>
              </td>
              <td className="px-5 py-4 text-[#6B7280] text-sm">{d.location_label ?? '—'}</td>
              <td className="px-5 py-4"><DeviceStatusBadge status={d.status} /></td>
              <td className="px-5 py-4 text-[#9CA3AF] text-sm">
                {d.last_used_at ? new Date(d.last_used_at).toLocaleDateString() : 'Never'}
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  {d.status === 'active' && (
                    <form action="/api/devices/pause" method="POST" className="inline">
                      <input type="hidden" name="device_id" value={d.id} />
                      <button type="submit" className="text-xs font-semibold text-amber-600 hover:text-amber-700 px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors">
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

export default async function DevicesPage({ searchParams }: { searchParams: { error?: string; success?: string } }) {
  const { vendor } = await getPortalData()

  return (
    <main className="px-6 pt-10 pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-[#9CA3AF] text-xs font-semibold tracking-widest uppercase mb-1">{vendor.business_name}</p>
          <h1 className="text-3xl font-extrabold text-[#111111]">NFC Devices</h1>
          <p className="text-[#6B7280] mt-1">Manage tap-to-stamp NFC devices at your venue</p>
        </div>

        {searchParams?.error && <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">{searchParams.error}</div>}
        {searchParams?.success && <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm font-semibold">{searchParams.success}</div>}

        {/* Register device form */}
        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-6 shadow-sm mb-6">
          <h2 className="text-base font-bold text-[#111111] mb-5">Register new device</h2>
          <form action="/api/devices/register" method="POST" className="flex flex-col gap-4">
            <input type="hidden" name="vendor_id" value={vendor.id} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#374151] mb-1.5">Device name</label>
                <input name="name" required placeholder="e.g. Counter A" className="w-full dark-input" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#374151] mb-1.5">Location label</label>
                <input name="location_label" placeholder="e.g. Front counter" className="w-full dark-input" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">Device token</label>
              <input name="device_token" required placeholder="Unique token from the NFC device" className="w-full dark-input font-mono text-sm" autoComplete="off" />
              <p className="text-[#9CA3AF] text-xs mt-1">This will be hashed before storage. Keep it secret.</p>
            </div>
            <button type="submit" className="btn-primary self-start">Register device</button>
          </form>
        </div>

        <Suspense fallback={
          <div className="bg-white border border-[#E8E2D9] rounded-3xl p-6 shadow-sm animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <WifiOff size={20} className="text-[#C8C0B4]" />
              <div className="h-4 w-40 bg-[#C8C0B4] rounded" />
            </div>
          </div>
        }>
          <DeviceList vendorId={vendor.id} />
        </Suspense>
      </div>
    </main>
  )
}
