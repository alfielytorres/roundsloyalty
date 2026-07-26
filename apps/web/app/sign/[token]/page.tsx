import Image from 'next/image'
import { headers } from 'next/headers'
import { vendorByJoinToken } from '@/lib/vendor-by-token'
import { SignQR, PrintButton } from './SignParts'

// A print-ready counter sign for a store, generated the moment they onboard.
// The QR encodes the /j/<token> URL so it works two ways: a native phone
// camera opens the landing page (download the app), and the Weekends Club app's
// in-app scanner recognises the URL and awards a round directly.
export const dynamic = 'force-dynamic'

export default async function StoreSignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const vendor = await vendorByJoinToken(token)

  if (!vendor) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F5F5F7] px-6">
        <p className="text-black/40 font-medium">Sign not found — check the link.</p>
      </main>
    )
  }

  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'rounds.app'
  const joinUrl = `${proto}://${host}/j/${vendor.join_token}`

  const brand = vendor.brand_color ?? '#1D1D1F'
  const rewardLine = vendor.reward_name && vendor.rounds_required
    ? `Collect ${vendor.rounds_required} rounds — get ${vendor.reward_name}`
    : 'Earn a round every visit'

  return (
    <main className="min-h-screen bg-[#E9E9EC] print:bg-white flex items-center justify-center py-10 print:py-0">
      <PrintButton />

      {/* The sign itself — A4 portrait proportions */}
      <div className="sign-sheet bg-white w-[210mm] min-h-[290mm] print:min-h-0 shadow-2xl print:shadow-none flex flex-col items-center text-center overflow-hidden">
        {/* Brand band */}
        <div className="w-full flex flex-col items-center pt-16 pb-12 px-12" style={{ backgroundColor: brand }}>
          {vendor.logo_url ? (
            <div className="w-24 h-24 rounded-3xl bg-white shadow-lg flex items-center justify-center overflow-hidden mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={vendor.logo_url} alt="" className="w-20 h-20 object-contain" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-white shadow-lg flex items-center justify-center mb-6">
              <span className="text-4xl">{vendor.stamp_icon ?? '☕'}</span>
            </div>
          )}
          <h1
            className="text-5xl font-black tracking-tight"
            style={{ color: luminance(brand) > 0.5 ? '#1D1D1F' : '#FFFFFF' }}
          >
            {vendor.business_name}
          </h1>
          <p
            className="mt-3 text-xl font-semibold"
            style={{ color: luminance(brand) > 0.5 ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.85)' }}
          >
            {rewardLine}
          </p>
        </div>

        {/* QR */}
        <div className="flex-1 flex flex-col items-center justify-center px-12 py-12 gap-8">
          <div className="rounded-[32px] border-8 p-8 bg-white" style={{ borderColor: brand }}>
            <SignQR value={joinUrl} size={300} />
          </div>

          <div className="flex flex-col gap-3 text-left text-[19px] leading-snug text-[#1D1D1F] font-medium">
            <p><span className="font-black">1.</span> Scan the code with your phone camera</p>
            <p><span className="font-black">2.</span> Get the Weekends Club app &amp; join {vendor.business_name}</p>
            <p><span className="font-black">3.</span> Scan in the app each visit to earn rounds</p>
          </div>
        </div>

        {/* Weekends Club footer */}
        <div className="w-full flex items-center justify-center gap-2.5 pb-10">
          <Image src="/logo.svg" alt="Weekends Club" width={30} height={30} unoptimized className="rounded-lg" />
          <span className="font-black text-[#1D1D1F] text-lg tracking-tight">Weekends Club</span>
          <span className="text-black/30 text-lg">·</span>
          <span className="text-black/40 text-lg">loyalty that comes around</span>
        </div>
      </div>
    </main>
  )
}

// WCAG-ish luminance for picking readable ink on the brand band.
function luminance(hex: string): number {
  const s = hex.replace('#', '')
  if (s.length !== 6) return 0
  const n = parseInt(s, 16)
  const lin = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin((n >> 16) & 0xff) + 0.7152 * lin((n >> 8) & 0xff) + 0.0722 * lin(n & 0xff)
}
