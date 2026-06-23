'use client'

import { useRef, useState, useEffect, ChangeEvent } from 'react'
import Image from 'next/image'
import { Minus, Plus, Check } from 'lucide-react'
import CardPreview from './CardPreview'
import { HEX6, resolveHex, STAMP_ICONS } from './colorUtils'

interface ProgramData {
  id: string
  name: string
  rounds_required: number
  reward_name: string
  reward_description: string | null
  reward_expiry_days: number | null
  default_round_value: number
}

interface Props {
  vendorId: string
  vendorName: string
  program: ProgramData | null
  logoUrl: string
  brandColor: string
  stampIcon: string
  cardBackgroundUrl: string
  stampBgColor: string
}

const PRESETS = [
  { label: 'Coffee', icon: '☕', rounds: 9, reward: 'Free coffee' },
  { label: 'Bubble tea', icon: '🧋', rounds: 10, reward: 'Free drink' },
  { label: 'Bakery', icon: '🥐', rounds: 8, reward: 'Free pastry' },
  { label: 'Gym', icon: '🏋️', rounds: 12, reward: 'Free class' },
  { label: 'Sports', icon: '🎾', rounds: 10, reward: 'Free session' },
]

const COLOR_SWATCHES = ['#E53935', '#8E24AA', '#1E88E5', '#00ACC1', '#43A047', '#F4511E', '#F9A825', '#3949AB', '#1D1D1F']

export default function ProgramEditor({ vendorId, vendorName, program, logoUrl: logo0, brandColor: brand0, stampIcon: icon0, cardBackgroundUrl: bg0, stampBgColor: panel0 }: Props) {
  // Program fields
  const [name, setName] = useState(program?.name ?? '')
  const [rounds, setRounds] = useState(program?.rounds_required ?? 10)
  const [roundValue, setRoundValue] = useState(program?.default_round_value ?? 1)
  const [rewardName, setRewardName] = useState(program?.reward_name ?? '')
  const [rewardDesc, setRewardDesc] = useState(program?.reward_description ?? '')
  const [expiry, setExpiry] = useState(program?.reward_expiry_days ?? 30)

  // Branding
  const [logoUrl, setLogoUrl] = useState(logo0)
  const [brandColor, setBrandColor] = useState(brand0 || '#1D1D1F')
  const [stampIcon, setStampIcon] = useState(icon0 || '☕')
  const [cardBgUrl, setCardBgUrl] = useState(bg0)
  const [stampBgColor, setStampBgColor] = useState(panel0)
  const [brandHex, setBrandHex] = useState(HEX6.test(brand0 || '') ? brand0.toUpperCase() : '#1D1D1F')
  const [stampBgHex, setStampBgHex] = useState(HEX6.test(panel0 || '') ? panel0.toUpperCase() : '')
  useEffect(() => { setBrandHex(resolveHex(brandColor) || '#1D1D1F') }, [brandColor])
  useEffect(() => { setStampBgHex(resolveHex(stampBgColor)) }, [stampBgColor])

  const [logoUploading, setLogoUploading] = useState(false)
  const [bgUploading, setBgUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const logoRef = useRef<HTMLInputElement>(null)
  const bgRef = useRef<HTMLInputElement>(null)

  async function upload(file: File, prefix: string): Promise<string | null> {
    const fd = new FormData()
    fd.append('file', file); fd.append('prefix', prefix)
    const res = await fetch('/api/settings/logo', { method: 'POST', body: fd })
    const json = await res.json()
    if (json.url) return json.url
    setError(json.error ?? 'Upload failed')
    return null
  }
  async function onLogo(e: ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (!f) return; setLogoUploading(true); setError(null); const u = await upload(f, 'logo'); if (u) setLogoUrl(u); setLogoUploading(false) }
  async function onBg(e: ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (!f) return; setBgUploading(true); setError(null); const u = await upload(f, 'card-bg'); if (u) setCardBgUrl(u); setBgUploading(false) }

  function applyPreset(p: typeof PRESETS[number]) {
    setStampIcon(p.icon)
    setRounds(p.rounds)
    if (!rewardName.trim()) setRewardName(p.reward)
    if (!name.trim()) setName(`${p.label} club`)
  }

  return (
    <form action="/api/programs/upsert" method="POST" className="space-y-5">
      {program && <input type="hidden" name="program_id" value={program.id} />}
      <input type="hidden" name="vendor_id" value={vendorId} />
      {/* Branding (persisted to the vendor by the same route) */}
      <input type="hidden" name="logo_url" value={logoUrl} />
      <input type="hidden" name="brand_color_text" value={brandHex} />
      <input type="hidden" name="stamp_icon" value={stampIcon} />
      <input type="hidden" name="card_background_url" value={cardBgUrl} />
      <input type="hidden" name="stamp_bg_color" value={stampBgHex} />
      {/* Stepper values */}
      <input type="hidden" name="rounds_required" value={rounds} />
      <input type="hidden" name="default_round_value" value={roundValue} />

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-black/35">{program ? 'Loyalty program' : 'Get started'}</p>
          <h2 className="text-xl font-bold text-[#1D1D1F] truncate">{program ? (name || 'Your program') : 'Create your program'}</h2>
        </div>
        {program && (
          <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Controls */}
        <div className="order-2 lg:order-1 space-y-4">
          {/* Quick start */}
          <Section title="Quick start" subtitle="Pick a starting point — tweak anything after">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button key={p.label} type="button" onClick={() => applyPreset(p)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1D1D1F] bg-white/70 border border-black/10 rounded-full pl-2.5 pr-3 py-1.5 hover:bg-white hover:border-black/20 hover:scale-[1.03] transition-all">
                  <span className="text-base">{p.icon}</span>{p.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Basics */}
          <Section title="Basics" subtitle="Name and how rounds are earned">
            <Field label="Program name">
              <input name="name" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Coffee Club" className="w-full dark-input" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Rounds for a reward">
                <Stepper value={rounds} set={v => setRounds(v)} min={1} max={50} />
                <div className="flex gap-1.5 mt-2">
                  {[6, 8, 10, 12].map(n => (
                    <button key={n} type="button" onClick={() => setRounds(n)}
                      className={`flex-1 text-xs font-bold py-1.5 rounded-lg border transition-colors ${rounds === n ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]' : 'border-black/10 text-black/50 hover:bg-black/5'}`}>{n}</button>
                  ))}
                </div>
              </Field>
              <Field label="Rounds per scan" hint="Usually 1">
                <Stepper value={roundValue} set={v => setRoundValue(v)} min={1} max={5} />
              </Field>
            </div>
          </Section>

          {/* Reward */}
          <Section title="Reward" subtitle="What customers unlock">
            <Field label="Reward name">
              <input name="reward_name" value={rewardName} onChange={e => setRewardName(e.target.value)} required placeholder="e.g. Free Coffee" className="w-full dark-input" />
            </Field>
            <Field label="Description">
              <textarea name="reward_description" value={rewardDesc} onChange={e => setRewardDesc(e.target.value)} rows={2} placeholder="Describe the reward for customers" className="w-full dark-input resize-none" />
            </Field>
            <Field label="Expiry (days)" hint="Days until an unlocked reward expires">
              <input type="number" name="reward_expiry_days" value={expiry} onChange={e => setExpiry(parseInt(e.target.value) || 0)} min={1} max={365} className="w-full dark-input" />
            </Field>
          </Section>

          {/* Card design */}
          <Section title="Card design" subtitle="How the loyalty card looks in the app">
            {/* Logo */}
            <Field label="Logo">
              <div onClick={() => logoRef.current?.click()}
                className="flex items-center gap-3 border-2 border-dashed border-black/10 rounded-2xl p-3 cursor-pointer bg-white/40 hover:bg-white/70 hover:border-black/20 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-white border border-black/8 flex items-center justify-center shrink-0 overflow-hidden">
                  {logoUrl ? <Image src={logoUrl} alt="Logo" width={48} height={48} className="max-w-full max-h-full object-contain p-1" unoptimized /> : <Plus size={18} className="text-black/25" />}
                </div>
                <p className="text-sm font-semibold text-black/55">{logoUploading ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}</p>
              </div>
              <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={onLogo} />
            </Field>

            {/* Card colour */}
            <Field label="Card colour" hint="The whole card uses this colour">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer shrink-0">
                  <input type="color" value={brandHex} onChange={e => setBrandColor(e.target.value)} className="sr-only" />
                  <div className="w-10 h-10 rounded-xl border border-black/10 shadow-sm" style={{ backgroundColor: brandHex }} />
                </label>
                <input value={brandColor} onChange={e => setBrandColor(e.target.value)} placeholder="#1D1D1F" className="flex-1 dark-input font-mono" />
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {COLOR_SWATCHES.map(c => (
                  <button key={c} type="button" onClick={() => setBrandColor(c)}
                    className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 ${brandHex.toUpperCase() === c ? 'border-black/50 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </Field>

            {/* Stamp icon */}
            <Field label="Stamp icon">
              <div className="flex flex-wrap gap-2">
                {STAMP_ICONS.map(ic => (
                  <button key={ic} type="button" onClick={() => setStampIcon(ic)}
                    className={`w-10 h-10 rounded-xl border-2 text-xl flex items-center justify-center transition-transform hover:scale-105 ${stampIcon === ic ? 'border-black/50 bg-black/5 scale-105' : 'border-transparent bg-white/50'}`}>{ic}</button>
                ))}
              </div>
            </Field>

            {/* Behind the stamps */}
            <Field label="Behind the stamps" hint="A colour or image to make stamps pop — image wins">
              <div className="flex items-center gap-2 mb-2">
                <label className="cursor-pointer shrink-0">
                  <input type="color" value={stampBgHex || brandHex} onChange={e => setStampBgColor(e.target.value)} className="sr-only" />
                  <div className="w-10 h-10 rounded-xl border border-black/10 shadow-sm" style={{ backgroundColor: stampBgHex || brandHex }} />
                </label>
                <input value={stampBgColor} onChange={e => setStampBgColor(e.target.value)} placeholder="Match card colour" className="flex-1 dark-input font-mono" />
                {stampBgColor && <button type="button" onClick={() => setStampBgColor('')} className="text-sm text-black/40 hover:text-black/70">Reset</button>}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16 h-10 rounded-xl shrink-0 overflow-hidden border border-black/10" style={{ background: cardBgUrl ? `url(${cardBgUrl}) center/cover` : (stampBgHex || brandHex) }} />
                <button type="button" onClick={() => bgRef.current?.click()} className="text-sm font-semibold text-black/60 border border-black/10 rounded-xl px-3 py-2 hover:bg-black/5 transition-colors">
                  {bgUploading ? 'Uploading…' : cardBgUrl ? 'Replace image' : 'Upload image'}
                </button>
                {cardBgUrl && <button type="button" onClick={() => setCardBgUrl('')} className="text-sm text-black/40 hover:text-black/70">Remove</button>}
              </div>
              <input ref={bgRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onBg} />
            </Field>
          </Section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" className="btn-primary w-full inline-flex items-center justify-center gap-2">
            <Check size={16} />{program ? 'Save changes' : 'Create program'}
          </button>
        </div>

        {/* Live preview */}
        <div className="order-1 lg:order-2 lg:sticky lg:top-6">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-black/35 mb-2">Live preview</p>
          <CardPreview
            vendorName={vendorName}
            logoUrl={logoUrl}
            brandHex={brandHex}
            stampBgHex={stampBgHex}
            cardBgUrl={cardBgUrl}
            icon={stampIcon}
            rounds={rounds}
            rewardName={rewardName}
          />
        </div>
      </div>
    </form>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-3xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-[#1D1D1F]">{title}</h3>
        {subtitle && <p className="text-xs text-black/35 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold tracking-widest uppercase text-black/40 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-black/35 text-xs mt-1">{hint}</p>}
    </div>
  )
}

function Stepper({ value, set, min, max }: { value: number; set: (n: number) => void; min: number; max: number }) {
  const btn = 'w-10 h-10 flex items-center justify-center rounded-xl border border-black/10 text-black/60 hover:bg-black/5 active:scale-95 transition-all disabled:opacity-30'
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => set(Math.max(min, value - 1))} disabled={value <= min} className={btn} aria-label="decrease"><Minus size={16} /></button>
      <span className="w-12 text-center text-xl font-bold text-[#1D1D1F] tabular-nums">{value}</span>
      <button type="button" onClick={() => set(Math.min(max, value + 1))} disabled={value >= max} className={btn} aria-label="increase"><Plus size={16} /></button>
    </div>
  )
}
