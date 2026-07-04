import Image from 'next/image'
import { vendorByJoinToken } from '@/lib/vendor-by-token'

// Where a printed store sign's QR lands when scanned with a native phone
// camera (the Rounds app's in-app scanner short-circuits the same URL into a
// stamp instead). Greets the customer, points them at the app.
export const dynamic = 'force-dynamic'

export default async function JoinLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const vendor = await vendorByJoinToken(token)
  const brand = vendor?.brand_color ?? '#1D1D1F'

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F5F5F7]">
      <div className="w-full max-w-xs flex flex-col items-center text-center">
        <Image src="/logo.svg" alt="Rounds" width={56} height={56} unoptimized className="mb-4 rounded-xl" />
        <p className="text-base font-bold tracking-tight text-black/30 mb-1.5">Rounds</p>

        {vendor ? (
          <>
            <h1 className="text-2xl font-bold text-[#1D1D1F]">{vendor.business_name}</h1>
            <p className="text-black/45 mt-1 text-sm">
              {vendor.reward_name && vendor.rounds_required
                ? `Collect ${vendor.rounds_required} rounds and get ${vendor.reward_name} — free.`
                : 'Earn a round every time you visit.'}
            </p>

            <div className="mt-7 w-full glass p-5 text-left">
              <ol className="text-sm text-black/60 flex flex-col gap-3">
                <li><span className="font-semibold text-[#1D1D1F]">1.</span> Get the <span className="font-semibold text-[#1D1D1F]">Rounds</span> app and sign up.</li>
                <li><span className="font-semibold text-[#1D1D1F]">2.</span> Tap the scan button and point it at the sign.</li>
                <li><span className="font-semibold text-[#1D1D1F]">3.</span> That&apos;s your first round — collect them for rewards.</li>
              </ol>
            </div>

            <a
              href="roundsloyalty://join"
              className="mt-5 w-full text-white font-semibold py-3 rounded-2xl transition-opacity hover:opacity-90 text-sm"
              style={{ backgroundColor: brand }}
            >
              Open the Rounds app
            </a>
            <p className="text-center text-xs text-black/25 mt-3">
              Don&apos;t have it yet? Rounds for iPhone is coming to the App Store.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[#1D1D1F]">Store not found</h1>
            <p className="text-black/45 mt-1 text-sm">This code isn&apos;t linked to an active store. Ask a staff member.</p>
          </>
        )}
      </div>
    </main>
  )
}
