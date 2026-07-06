'use client'

import { useRef, useState, useEffect, ChangeEvent } from 'react'
import Image from 'next/image'
import { Minus, Plus, Check } from 'lucide-react'
import CardPreview from './CardPreview'
import SubmitButton from '@/components/SubmitButton'
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
  cardFrontUrl?: string
  cardFrontHeadline?: string
  cardFrontSubtext?: string
  cardBackMessage?: string
  cardFrontTextColor?: string
  cardBackTextColor?: string
  stampColor?: string
}

const PRESETS = [
  { label: 'Coffee', icon: '☕', rounds: 9, reward: 'Free coffee' },
  { label: 'Bubble tea', icon: '🧋', rounds: 10, reward: 'Free drink' },
  { label: 'Bakery', icon: '🥐', rounds: 8, reward: 'Free pastry' },
  { label: 'Gym', icon: '🏋️', rounds: 10, reward: 'Free class' },
  { label: 'Sports', icon: '🎾', rounds: 10, reward: 'Free session' },
]

// Pastel-forward, trendy palette. Light tones get black ink, dark tones white —
// handled downstream by onColor(), so every swatch stays legible.
const COLOR_SWATCHES = [
  '#FF8FAB', // bubblegum pink
  '#FF6B6B', // coral
  '#FF9F68', // peach
  '#FFC44D', // marigold
  '#FFE066', // butter yellow
  '#C4E17F', // lime
  '#8CE0B0', // mint
  '#4ECDC4', // teal
  '#5BC0EB', // sky blue
  '#6C8DFF', // cornflower
  '#9D8DF1', // periwinkle
  '#C08CF0', // lilac
  '#EA80C8', // orchid
  '#A67B5B', // mocha
  '#1D1D1F', // ink
]

export default function ProgramEditor({ vendorId, vendorName, program, logoUrl: logo0, brandColor: brand0, stampIcon: icon0, cardBackgroundUrl: bg0, stampBgColor: panel0, cardFrontUrl: front0 = '', cardFrontHeadline: fhl0 = '', cardFrontSubtext: fsub0 = '', cardBackMessage: bmsg0 = '', cardFrontTextColor: ftc0 = '', cardBackTextColor: btc0 = '', stampColor: stampcol0 = '' }: Props) {
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
  const [stampColor, setStampColor] = useState(stampcol0)
  // Two-sided card
  const [cardFrontUrl, setCardFrontUrl] = useState(front0)
  const [frontHeadline, setFrontHeadline] = useState(fhl0)
  const [frontSubtext, setFrontSubtext] = useState(fsub0)
  const [backMessage, setBackMessage] = useState(bmsg0)
  const [frontTextColor, setFrontTextColor] = useState(ftc0)
  const [backTextColor, setBackTextColor] = useState(btc0)
  const [frontUploading, setFrontUploading] = useState(false)
  const frontRef = useRef<HTMLInputElement>(null)
  const [brandHex, setBrandHex] = useState(HEX6.test(brand0 || '') ? brand0.toUpperCase() : '#1D1D1F')
  const [stampBgHex, setStampBgHex] = useState(HEX6.test(panel0 || '') ? panel0.toUpperCase() : '')
  const [stampColorHex, setStampColorHex] = useState(HEX6.test(stampcol0 || '') ? stampcol0.toUpperCase() : '')
  useEffect(() => { setBrandHex(resolveHex(brandColor) || '#1D1D1F') }, [brandColor])
  useEffect(() => { setStampBgHex(resolveHex(stampBgColor)) }, [stampBgColor])
  useEffect(() => { setStampColorHex(resolveHex(stampColor)) }, [stampColor])

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
  async function onFront(e: ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (!f) return; setFrontUploading(true); setError(null); const u = await upload(f, 'card-front'); if (u) setCardFrontUrl(u); setFrontUploading(false) }

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
      <input type="hidden" name="card_front_url" value={cardFrontUrl} />
      <input type="hidden" name="card_front_headline" value={frontHeadline} />
      <input type="hidden" name="card_front_subtext" value={frontSubtext} />
      <input type="hidden" name="card_back_message" value={backMessage} />
      <input type="hidden" name="card_front_text_color" value={frontTextColor} />
      <input type="hidden" name="card_back_text_color" value={backTextColor} />
      <input type="hidden" name="stamp_color" value={stampColorHex} />
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
              <Field label="Rounds for a reward" hint="Up to 10 stamps">
                <Stepper value={rounds} set={v => setRounds(v)} min={1} max={10} />
                <div className="flex gap-1.5 mt-2">
                  {[6, 8, 10].map(n => (
                    <button key={n} type="button" onClick={() => setRounds(n)}
                      className={`flex-1 text-xs font-bold py-1.5 rounded-lg border transition-colors ${rounds === n ? 'bg-rounds text-white border-rounds' : 'border-black/10 text-black/50 hover:bg-black/5'}`}>{n}</button>
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
              <ColorPicker value={brandColor} hex={brandHex} onChange={setBrandColor} />
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

            {/* Stamp colour */}
            <Field label="Stamp colour" hint="The colour of the stamp itself. Blank = auto (readable ink).">
              <ColorPicker value={stampColor} hex={stampColorHex || '#1D1D1F'} onChange={setStampColor} placeholder="Auto" onReset={() => setStampColor('')} />
            </Field>

            {/* Behind the stamps */}
            <Field label="Behind the stamps" hint="A colour or image to make stamps pop — image wins">
              <ColorPicker value={stampBgColor} hex={stampBgHex || brandHex} onChange={setStampBgColor} placeholder="Match card colour" onReset={() => setStampBgColor('')} />
              <div className="flex items-center gap-3 mt-3">
                <div className="w-16 h-10 rounded-xl shrink-0 overflow-hidden border border-black/10" style={{ background: cardBgUrl ? `url(${cardBgUrl}) center/cover` : (stampBgHex || brandHex) }} />
                <button type="button" onClick={() => bgRef.current?.click()} className="text-sm font-semibold text-black/60 border border-black/10 rounded-xl px-3 py-2 hover:bg-black/5 transition-colors">
                  {bgUploading ? 'Uploading…' : cardBgUrl ? 'Replace image' : 'Upload image'}
                </button>
                {cardBgUrl && <button type="button" onClick={() => setCardBgUrl('')} className="text-sm text-black/40 hover:text-black/70">Remove</button>}
              </div>
              <input ref={bgRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onBg} />
            </Field>
          </Section>

          {/* Card front — the identity side */}
          <Section title="Card front" subtitle="The face customers see first. Leave blank for a clean branded card.">
            <Field label="Front background" hint="Full-bleed art (a designed image). Optional.">
              <div className="flex items-center gap-3">
                <div className="w-20 h-12 rounded-xl shrink-0 overflow-hidden border border-black/10 bg-black/5"
                  style={{ background: cardFrontUrl ? `url(${cardFrontUrl}) center/cover` : (brandHex) }} />
                <button type="button" onClick={() => frontRef.current?.click()} className="text-sm font-semibold text-black/60 border border-black/10 rounded-xl px-3 py-2 hover:bg-black/5 transition-colors">
                  {frontUploading ? 'Uploading…' : cardFrontUrl ? 'Replace' : 'Upload art'}
                </button>
                {cardFrontUrl && <button type="button" onClick={() => setCardFrontUrl('')} className="text-sm text-black/40 hover:text-black/70">Remove</button>}
              </div>
              <input ref={frontRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFront} />
            </Field>
            <Field label="Headline" hint="Top of the front. Defaults to your store name.">
              <input value={frontHeadline} onChange={e => setFrontHeadline(e.target.value)} maxLength={40} placeholder={vendorName || 'Your Store'} className="w-full dark-input" />
            </Field>
            <Field label="Subtext" hint="Bottom of the front. Optional.">
              <input value={frontSubtext} onChange={e => setFrontSubtext(e.target.value)} maxLength={60} placeholder="e.g. Sip. Stamp. Repeat." className="w-full dark-input" />
            </Field>
            <Field label="Text colour" hint="Auto picks the most readable shade.">
              <TextColorToggle value={frontTextColor} onChange={setFrontTextColor} />
            </Field>
          </Section>

          {/* Card back — the functional side */}
          <Section title="Card back" subtitle="The stamp side">
            <Field label="Message" hint="Shown above the stamps. Defaults from your reward.">
              <input value={backMessage} onChange={e => setBackMessage(e.target.value)} maxLength={60} placeholder="e.g. We're so lucky to have you!" className="w-full dark-input" />
            </Field>
            <Field label="Text colour" hint="Auto picks the most readable shade.">
              <TextColorToggle value={backTextColor} onChange={setBackTextColor} />
            </Field>
          </Section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <SubmitButton className="btn-primary w-full inline-flex items-center justify-center gap-2"
            pendingText={program ? 'Saving…' : 'Creating…'}>
            <Check size={16} />{program ? 'Save changes' : 'Create program'}
          </SubmitButton>
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
            frontUrl={cardFrontUrl}
            frontHeadline={frontHeadline}
            frontSubtext={frontSubtext}
            backMessage={backMessage}
            frontTextColor={frontTextColor}
            backTextColor={backTextColor}
            stampColor={stampColorHex}
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

function ColorPicker({ value, hex, onChange, placeholder, onReset }: {
  value: string; hex: string; onChange: (v: string) => void; placeholder?: string; onReset?: () => void
}) {
  const nativeRef = useRef<HTMLInputElement>(null)
  // iOS Safari doesn't reliably fire React's synthetic onChange for a colour
  // input (the native sheet opens but the value never propagates), so bind the
  // DOM input/change events directly.
  useEffect(() => {
    const el = nativeRef.current
    if (!el) return
    const push = () => onChange(el.value)
    el.addEventListener('input', push)
    el.addEventListener('change', push)
    return () => { el.removeEventListener('input', push); el.removeEventListener('change', push) }
  }, [onChange])
  return (
    <div>
      <div className="flex items-center gap-2">
        {/* A real, visible native colour input — mobile Safari won't commit a
            change on a hidden colour input, so it must stay on-screen. */}
        <input ref={nativeRef} type="color" aria-label="Pick a colour" value={hex}
          onChange={e => onChange(e.target.value)} className="color-swatch" />
        <input value={value} onChange={e => onChange(e.target.value)} inputMode="text" autoCapitalize="characters"
          placeholder={placeholder ?? '#1D1D1F'} className="flex-1 dark-input font-mono" />
        {onReset && value && <button type="button" onClick={onReset} className="text-sm text-black/40 hover:text-black/70">Reset</button>}
      </div>
      <div className="flex gap-2 mt-2 flex-wrap">
        {COLOR_SWATCHES.map(c => (
          <button key={c} type="button" onClick={() => onChange(c)} aria-label={`Use ${c}`}
            className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 active:scale-95 ${hex.toUpperCase() === c ? 'border-black/60 scale-110' : 'border-black/10'}`}
            style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  )
}

function TextColorToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts: { v: string; label: string; sw?: string }[] = [
    { v: '', label: 'Auto' },
    { v: 'dark', label: 'Black', sw: '#1D1D1F' },
    { v: 'light', label: 'White', sw: '#ffffff' },
  ]
  return (
    <div className="inline-flex rounded-xl border border-black/10 bg-white/50 p-0.5">
      {opts.map(o => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[10px] transition-colors ${value === o.v ? 'bg-[#1D1D1F] text-white' : 'text-black/55 hover:bg-black/5'}`}>
          {o.sw && <span className="w-3 h-3 rounded-full border border-black/15" style={{ backgroundColor: o.sw }} />}
          {o.label}
        </button>
      ))}
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
