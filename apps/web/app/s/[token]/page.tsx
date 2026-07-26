import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

// Always resolve the token at request time; never statically prerender.
export const dynamic = 'force-dynamic'

type DeviceRow = {
  status: string
  vendors:
    | { business_name: string; brand_color: string | null }
    | { business_name: string; brand_color: string | null }[]
    | null
}

async function lookupDevice(token: string) {
  // RLS on nfc_stamp_devices is owner/staff-only, so use the service role to
  // resolve the (public-safe) vendor info for an anonymous customer.
  const hash = createHash('sha256').update(token).digest('hex')
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data } = await admin
    .from('nfc_stamp_devices')
    .select('status, vendors(business_name, brand_color)')
    .eq('device_token_hash', hash)
    .maybeSingle()

  const row = data as DeviceRow | null
  if (!row?.vendors) return null
  const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors
  if (!vendor) return null

  return {
    status: row.status,
    businessName: vendor.business_name,
    brandColor: vendor.brand_color ?? '#1D1D1F',
  }
}

export default async function NfcTagPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const device = await lookupDevice(token)
  const active = device?.status === 'active'

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F5F5F7]">
      <div className="w-full max-w-xs flex flex-col items-center text-center">
        <Image src="/logo.svg" alt="Weekends Club" width={56} height={56} unoptimized className="mb-4" />
        <p className="text-base font-bold tracking-tight text-black/30 mb-1.5">Weekends Club</p>

        {active && device ? (
          <>
            <h1 className="text-2xl font-bold text-[#1D1D1F]">{device.businessName}</h1>
            <p className="text-black/45 mt-1 text-sm">Tap with the Weekends Club app to collect your round.</p>

            <div className="mt-7 w-full bg-white/70 backdrop-blur-xl rounded-3xl border border-white/90 shadow-sm p-5 text-left">
              <ol className="text-sm text-black/60 flex flex-col gap-3">
                <li><span className="font-semibold text-[#1D1D1F]">1.</span> Open the Weekends Club app and sign in.</li>
                <li><span className="font-semibold text-[#1D1D1F]">2.</span> Go to <span className="font-semibold text-[#1D1D1F]">My QR Code</span> and press <span className="font-semibold text-[#1D1D1F]">Tap to stamp</span>.</li>
                <li><span className="font-semibold text-[#1D1D1F]">3.</span> Hold your phone here again to collect your round.</li>
              </ol>
            </div>

            <a href="roundsloyalty://stamp"
              className="mt-5 w-full text-white font-semibold py-3 rounded-2xl transition-opacity hover:opacity-90 text-sm"
              style={{ backgroundColor: device.brandColor }}>
              Open Weekends Club app
            </a>
            <p className="text-center text-xs text-black/25 mt-3">
              Don&apos;t have the app yet? Ask a staff member to help you join.
            </p>
          </>
        ) : device && !active ? (
          <>
            <h1 className="text-2xl font-bold text-[#1D1D1F]">Tag inactive</h1>
            <p className="text-black/45 mt-1 text-sm">This stamp tag is currently turned off. Please ask a staff member.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[#1D1D1F]">Tag not recognised</h1>
            <p className="text-black/45 mt-1 text-sm">This tag isn&apos;t set up for stamps yet.</p>
          </>
        )}
      </div>
    </main>
  )
}
