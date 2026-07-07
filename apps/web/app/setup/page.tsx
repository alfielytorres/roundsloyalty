import Link from 'next/link'
import { getPortalData, fetchProgram } from '@/lib/portal-data'
import { Palette, Cpu, Users, Check, ArrowRight, Sparkles, type LucideIcon } from 'lucide-react'
import SetupWizard from './SetupWizard'

interface Step {
  key: string
  title: string
  desc: string
  icon: LucideIcon
  href: string
  done: boolean
}

export default async function SetupPage() {
  // allowIncomplete so the gate in getPortalData doesn't redirect this page to itself.
  const { vendor, supabase } = await getPortalData({ allowIncomplete: true })
  const program = await fetchProgram(vendor.id, supabase)
  const requiredComplete = !!vendor.address && !!vendor.phone && !!program

  // Not done yet → the mandatory wizard (program + phone + address in one submit).
  if (!requiredComplete) {
    return (
      <main className="px-5 pt-10 pb-32">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <p className="text-xs tracking-widest uppercase text-black/30 font-semibold mb-1 flex items-center gap-1.5">
              <Sparkles size={13} /> Finish setup
            </p>
            <h1 className="text-2xl font-bold text-[#1D1D1F]">Set up {vendor.business_name}</h1>
            <p className="text-black/40 text-sm mt-0.5">Three quick things and your dashboard unlocks.</p>
          </div>
          <SetupWizard
            programName={program?.name ?? ''}
            rounds={program?.rounds_required ?? 10}
            rewardName={program?.reward_name ?? ''}
            phone={vendor.phone ?? ''}
            address={vendor.address ?? ''}
            lat={vendor.lat ?? undefined}
            lng={vendor.lng ?? undefined}
          />
        </div>
      </main>
    )
  }

  // Required steps done → optional polish + a way back to the dashboard.
  const [{ count: devices }, { count: staff }] = await Promise.all([
    supabase.from('nfc_stamp_devices').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id),
    supabase.from('vendor_staff').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id).eq('status', 'active'),
  ])

  const steps: Step[] = [
    {
      key: 'brand', title: 'Brand your loyalty card', icon: Palette, href: '/programs',
      desc: 'Add your logo, colours and stamp icon — see it live.',
      done: !!(vendor.logo_url || vendor.brand_color || vendor.stamp_icon),
    },
    {
      key: 'device', title: 'Set up tap-to-stamp', icon: Cpu, href: '/devices',
      desc: 'Register an NFC tag so staff can stamp with a tap.',
      done: (devices ?? 0) > 0,
    },
    {
      key: 'staff', title: 'Invite your team', icon: Users, href: '/staff',
      desc: 'Give staff access to stamp customers and hand over rewards.',
      done: (staff ?? 0) > 0,
    },
  ]

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <p className="text-xs tracking-widest uppercase text-black/30 font-semibold mb-1 flex items-center gap-1.5">
            <Sparkles size={13} /> Setup guide
          </p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">You&apos;re all set 🎉</h1>
          <p className="text-black/40 text-sm mt-0.5">The essentials are done. These optional touches make your program shine.</p>
        </div>

        <div className="flex flex-col gap-3">
          {steps.map((s) => (
            <Link key={s.key} href={s.href}
              className={`glass flex items-center gap-4 transition-all hover:-translate-y-0.5 ${s.done ? 'opacity-75' : ''}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${s.done ? 'bg-rounds text-white' : 'bg-black/5 text-black/50'}`}>
                {s.done ? <Check size={18} /> : <s.icon size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#1D1D1F] text-sm">{s.title}</p>
                <p className="text-black/40 text-xs mt-0.5">{s.desc}</p>
              </div>
              <span className={`shrink-0 text-xs font-semibold inline-flex items-center gap-1 ${s.done ? 'text-black/30' : 'text-rounds'}`}>
                {s.done ? 'Edit' : 'Set up'} <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
            Go to dashboard <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  )
}
