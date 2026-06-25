import Link from 'next/link'
import { getPortalData, fetchProgram } from '@/lib/portal-data'
import { Store, Award, Palette, MapPin, Cpu, Users, Check, ArrowRight, Sparkles, type LucideIcon } from 'lucide-react'

interface Step {
  key: string
  title: string
  desc: string
  icon: LucideIcon
  href: string
  done: boolean
  optional?: boolean
}

export default async function SetupPage() {
  const { vendor, supabase } = await getPortalData()
  const program = await fetchProgram(vendor.id, supabase)

  const [{ count: locations }, { count: devices }, { count: staff }] = await Promise.all([
    supabase.from('vendor_locations').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id),
    supabase.from('nfc_stamp_devices').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id),
    supabase.from('vendor_staff').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id).eq('status', 'active'),
  ])

  const steps: Step[] = [
    {
      key: 'business', title: 'Business details', icon: Store, href: '/settings',
      desc: 'Name, category and address so customers can find you.',
      done: !!vendor.business_name && !!vendor.address,
    },
    {
      key: 'program', title: 'Create your loyalty program', icon: Award, href: '/programs',
      desc: 'Set how many rounds earn a reward, and what the reward is.',
      done: !!program,
    },
    {
      key: 'brand', title: 'Brand your loyalty card', icon: Palette, href: '/programs',
      desc: 'Add your logo, colours and stamp icon — see it live.',
      done: !!(vendor.logo_url || vendor.brand_color || vendor.stamp_icon),
    },
    {
      key: 'location', title: 'Add your location', icon: MapPin, href: '/settings',
      desc: 'Put your store on the map so customers can discover it.',
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

  const doneCount = steps.filter(s => s.done).length
  const total = steps.length
  const pct = Math.round((doneCount / total) * 100)
  const allDone = doneCount === total

  return (
    <main className="px-5 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <p className="text-xs tracking-widest uppercase text-black/30 font-semibold mb-1 flex items-center gap-1.5">
            <Sparkles size={13} /> Setup guide
          </p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">{allDone ? "You're all set 🎉" : 'Finish setting up'}</h1>
          <p className="text-black/40 text-sm mt-0.5">
            {allDone ? 'Everything’s configured — you can revisit any step any time.' : 'A few quick steps to get your loyalty program live.'}
          </p>
        </div>

        {/* Progress */}
        <div className="glass mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#1D1D1F]">{doneCount} of {total} done</span>
            <span className="text-sm font-bold text-rounds">{pct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-black/5 overflow-hidden">
            <div className="h-full rounded-full bg-rounds transition-[width] duration-500" style={{ width: `${Math.max(pct, 4)}%` }} />
          </div>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <Link key={s.key} href={s.href}
              className={`glass flex items-center gap-4 transition-all hover:-translate-y-0.5 ${s.done ? 'opacity-75' : ''}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${s.done ? 'bg-rounds text-white' : 'bg-black/5 text-black/50'}`}>
                {s.done ? <Check size={18} /> : <s.icon size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[#1D1D1F] text-sm">{i + 1}. {s.title}</p>
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
          <Link href="/dashboard" className="text-sm font-semibold text-black/45 hover:text-black/70 transition-colors">
            {allDone ? 'Go to dashboard' : 'Skip for now'}
          </Link>
        </div>
      </div>
    </main>
  )
}
