import Link from 'next/link'
import { getPortalData, fetchProgram } from '@/lib/portal-data'
import { Award, MapPin, Phone, Pin, Cpu, Users, Check, ArrowRight, Sparkles, Lock, type LucideIcon } from 'lucide-react'

interface Step {
  key: string
  title: string
  desc: string
  icon: LucideIcon
  href: string
  done: boolean
  required?: boolean
  optional?: boolean
}

export default async function SetupPage() {
  // allowIncomplete so the portal gate doesn't redirect this page (and the
  // config pages it links to) to itself while onboarding is unfinished.
  const { vendor, supabase } = await getPortalData({ allowIncomplete: true })
  const program = await fetchProgram(vendor.id, supabase)

  const [{ count: locations }, { count: devices }, { count: staff }] = await Promise.all([
    supabase.from('vendor_locations').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id),
    supabase.from('nfc_stamp_devices').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id),
    supabase.from('vendor_staff').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id).eq('status', 'active'),
  ])

  const steps: Step[] = [
    {
      key: 'program', title: 'Create & brand your loyalty card', icon: Award, href: '/programs', required: true,
      desc: 'Set the rounds and reward, then design the card — logo, colours, stamp, front & back.',
      done: !!program,
    },
    {
      key: 'address', title: 'Add your address', icon: MapPin, href: '/settings', required: true,
      desc: 'Your store’s contact address.',
      done: !!vendor.address,
    },
    {
      key: 'phone', title: 'Add a phone number', icon: Phone, href: '/settings', required: true,
      desc: 'A contact number for your store.',
      done: !!vendor.phone,
    },
    {
      key: 'locations', title: 'Put your store on the map', icon: Pin, href: '/settings', optional: true,
      desc: 'Add one or more map locations so customers can discover you.',
      done: (locations ?? 0) > 0,
    },
    {
      key: 'device', title: 'Set up tap-to-stamp', icon: Cpu, href: '/devices', optional: true,
      desc: 'Register an NFC tag so staff can stamp with a tap.',
      done: (devices ?? 0) > 0,
    },
    {
      key: 'staff', title: 'Invite your team', icon: Users, href: '/staff', optional: true,
      desc: 'Give staff access to stamp customers and hand over rewards.',
      done: (staff ?? 0) > 0,
    },
  ]

  const requiredSteps = steps.filter(s => s.required)
  const requiredDone = requiredSteps.every(s => s.done)
  const requiredDoneCount = requiredSteps.filter(s => s.done).length
  const pct = Math.round((requiredDoneCount / requiredSteps.length) * 100)

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <p className="text-xs tracking-widest uppercase text-black/30 font-semibold mb-1 flex items-center gap-1.5">
            <Sparkles size={13} /> Setup guide
          </p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">{requiredDone ? "You're all set 🎉" : `Set up ${vendor.business_name}`}</h1>
          <p className="text-black/40 text-sm mt-0.5">
            {requiredDone
              ? 'The essentials are done — these optional touches make your program shine.'
              : 'Complete the required steps to unlock your dashboard. Each opens the full editor.'}
          </p>
        </div>

        {!requiredDone && (
          <div className="glass mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[#1D1D1F]">{requiredDoneCount} of {requiredSteps.length} required done</span>
              <span className="text-sm font-bold text-rounds">{pct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-black/5 overflow-hidden">
              <div className="h-full rounded-full bg-rounds transition-[width] duration-500" style={{ width: `${Math.max(pct, 4)}%` }} />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {/* While locked, only show the required steps — the optional ones link
              to gated pages (dashboard/devices/staff) that stay locked until done. */}
          {(requiredDone ? steps : requiredSteps).map((s, i) => (
            <Link key={s.key} href={s.href}
              className={`glass flex items-center gap-4 transition-all hover:-translate-y-0.5 ${s.done ? 'opacity-75' : ''}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${s.done ? 'bg-rounds text-white' : 'bg-black/5 text-black/50'}`}>
                {s.done ? <Check size={18} /> : <s.icon size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[#1D1D1F] text-sm">{i + 1}. {s.title}</p>
                  {s.required && !s.done && <span className="text-[10px] font-bold uppercase tracking-wide text-rounds bg-rounds-soft px-1.5 py-0.5 rounded-full">Required</span>}
                  {s.optional && <span className="text-[10px] font-bold uppercase tracking-wide text-black/30 bg-black/5 px-1.5 py-0.5 rounded-full">Optional</span>}
                </div>
                <p className="text-black/40 text-xs mt-0.5">{s.desc}</p>
              </div>
              <span className={`shrink-0 text-xs font-semibold inline-flex items-center gap-1 ${s.done ? 'text-black/30' : 'text-rounds'}`}>
                {s.done ? 'Edit' : 'Set up'} <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center">
          {requiredDone ? (
            <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
              Go to dashboard <ArrowRight size={16} />
            </Link>
          ) : (
            <p className="text-sm font-medium text-black/40 inline-flex items-center gap-1.5">
              <Lock size={14} /> Finish the required steps to unlock your dashboard
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
