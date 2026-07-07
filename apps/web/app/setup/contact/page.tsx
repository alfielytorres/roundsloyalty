import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getPortalData } from '@/lib/portal-data'
import ContactForm from './ContactForm'

export const dynamic = 'force-dynamic'

export default async function SetupContactPage() {
  const { vendor } = await getPortalData({ allowIncomplete: true })

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <Link href="/setup" className="inline-flex items-center gap-1.5 text-sm font-medium text-black/40 hover:text-black/70 mb-5">
          <ArrowLeft size={16} /> Back to setup
        </Link>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Contact details</h1>
          <p className="text-black/40 text-sm mt-0.5">A phone number and address for {vendor.business_name}.</p>
        </div>
        <ContactForm
          phone={vendor.phone ?? ''}
          address={vendor.address ?? ''}
          lat={vendor.lat ?? undefined}
          lng={vendor.lng ?? undefined}
        />
      </div>
    </main>
  )
}
