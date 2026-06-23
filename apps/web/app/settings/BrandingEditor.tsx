'use client'

import { useRef, useState, useCallback, DragEvent, ChangeEvent } from 'react'
import Image from 'next/image'

interface Props {
  defaultLogoUrl: string
  defaultBrandColor: string
  defaultStampIcon?: string
  defaultCardBackgroundUrl?: string
  defaultStampBgColor?: string
  vendorName: string
  rewardName: string
  roundsRequired: number
}

const STAMP_ICONS = ['☕', '🥐', '🍩', '🍪', '🍞', '🧋', '🍕', '🍔', '🌮', '🍦', '🍰', '🧁', '🍺', '🍷', '⭐', '❤️', '🎁', '🌟']

// Relative luminance (0…1) of a #rrggbb colour.
function lum(hex: string): number {
  const h = hex.replace('#', '').trim()
  if (h.length !== 6) return 0
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export default function BrandingEditor({
  defaultLogoUrl, defaultBrandColor, defaultStampIcon = '☕', defaultCardBackgroundUrl = '', defaultStampBgColor = '',
  vendorName, rewardName, roundsRequired,
}: Props) {
  const [logoUrl, setLogoUrl] = useState(defaultLogoUrl)
  const [brandColor, setBrandColor] = useState(defaultBrandColor || '#1D1D1F')
  const [stampIcon, setStampIcon] = useState(defaultStampIcon || '☕')
  const [cardBgUrl, setCardBgUrl] = useState(defaultCardBackgroundUrl)
  const [stampBgColor, setStampBgColor] = useState(defaultStampBgColor)
  const [uploading, setUploading] = useState(false)
  const [bgUploading, setBgUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File, prefix: string): Promise<string | null> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('prefix', prefix)
    const res = await fetch('/api/settings/logo', { method: 'POST', body: fd })
    const json = await res.json()
    if (json.url) return json.url
    setUploadError(json.error ?? 'Upload failed')
    return null
  }
  async function uploadLogo(file: File) { setUploading(true); setUploadError(null); const u = await upload(file, 'logo'); if (u) setLogoUrl(u); setUploading(false) }
  async function uploadBackground(file: File) { setBgUploading(true); setUploadError(null); const u = await upload(file, 'card-bg'); if (u) setCardBgUrl(u); setBgUploading(false) }

  function onDrop(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadLogo(f) }
  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(true) }, [])
  const onDragLeave = useCallback(() => setDragOver(false), [])
  function onLogoChange(e: ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) uploadLogo(f) }
  function onBgChange(e: ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) uploadBackground(f) }

  // Preview a partially-filled card.
  const displayStamps = Math.min(roundsRequired || 1, 10)
  const sampleRounds = Math.min(Math.floor(roundsRequired * 0.6), roundsRequired - 1) || 3
  const filledCount = Math.min(sampleRounds, displayStamps)

  // Colours, mirroring the iOS LoyaltyCardView.
  const cardIsLight = lum(brandColor) > 0.6
  const onCard = cardIsLight ? '#1D1D1F' : '#ffffff'
  const hasPanelColor = !!stampBgColor
  const panelIsLight = hasPanelColor ? lum(stampBgColor) > 0.6 : cardIsLight
  const emptyIsWhite = cardBgUrl ? true : !panelIsLight
  const emptyFilter = emptyIsWhite ? 'brightness(0) invert(1)' : 'brightness(0)'

  return (
    <div className="flex flex-col gap-6">
      {/* Hidden inputs submitted with the program form */}
      <input type="hidden" name="logo_url" value={logoUrl} />
      <input type="hidden" name="brand_color_text" value={brandColor} />
      <input type="hidden" name="stamp_icon" value={stampIcon} />
      <input type="hidden" name="card_background_url" value={cardBgUrl} />
      <input type="hidden" name="stamp_bg_color" value={stampBgColor} />

      {/* Logo upload */}
      <div>
        <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Logo</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          className={`relative flex items-center gap-4 border-2 border-dashed rounded-2xl p-4 cursor-pointer transition-colors select-none
            ${dragOver ? 'border-black/40 bg-black/5' : 'border-black/10 bg-white/40 hover:bg-white/60 hover:border-black/20'}`}
        >
          <div className="w-16 h-16 rounded-xl bg-black/5 flex items-center justify-center shrink-0 overflow-hidden border border-black/8">
            {logoUrl ? (
              <Image src={logoUrl} alt="Logo" width={64} height={64} className="object-contain w-full h-full" unoptimized />
            ) : (
              <svg className="w-7 h-7 text-black/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {uploading ? (
              <p className="text-sm text-black/40 font-medium">Uploading…</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-black/60">{logoUrl ? 'Replace logo' : 'Upload logo'}</p>
                <p className="text-xs text-black/30 mt-0.5">Drag & drop or click · PNG, JPG, WebP · max 2 MB</p>
              </>
            )}
            {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
          </div>
          {uploading && <div className="shrink-0 w-5 h-5 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />}
        </div>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={onLogoChange} />
      </div>

      {/* Brand colour (whole card) */}
      <div>
        <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Card colour</label>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer shrink-0 relative">
            <input type="color" value={brandColor.startsWith('#') && brandColor.length === 7 ? brandColor : '#1D1D1F'} onChange={e => setBrandColor(e.target.value)} className="sr-only" />
            <div className="w-10 h-10 rounded-xl border border-black/10 shadow-sm" style={{ backgroundColor: brandColor }} />
          </label>
          <input value={brandColor} onChange={e => setBrandColor(e.target.value)} placeholder="#1D1D1F" maxLength={7} className="flex-1 dark-input font-mono" />
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {['#E53935', '#8E24AA', '#1E88E5', '#00ACC1', '#43A047', '#F4511E', '#F9A825', '#3949AB', '#1D1D1F'].map(c => (
            <button key={c} type="button" onClick={() => setBrandColor(c)}
              className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 ${brandColor === c ? 'border-black/50 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }} title={c} />
          ))}
        </div>
        <p className="text-xs text-black/30 mt-1.5">The whole card uses this colour.</p>
      </div>

      {/* Stamp icon */}
      <div>
        <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Stamp icon</label>
        <div className="flex flex-wrap gap-2">
          {STAMP_ICONS.map(ic => (
            <button key={ic} type="button" onClick={() => setStampIcon(ic)}
              className={`w-10 h-10 rounded-xl border-2 text-xl flex items-center justify-center transition-transform hover:scale-105
                ${stampIcon === ic ? 'border-black/50 bg-black/5 scale-105' : 'border-transparent bg-white/50'}`}
              title={ic}>{ic}</button>
          ))}
        </div>
      </div>

      {/* Stamp panel: colour or image */}
      <div>
        <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Behind the stamps</label>
        <div className="flex items-center gap-2 mb-2">
          <label className="cursor-pointer shrink-0 relative">
            <input type="color" value={stampBgColor.startsWith('#') && stampBgColor.length === 7 ? stampBgColor : brandColor} onChange={e => setStampBgColor(e.target.value)} className="sr-only" />
            <div className="w-10 h-10 rounded-xl border border-black/10 shadow-sm" style={{ backgroundColor: stampBgColor || brandColor }} />
          </label>
          <input value={stampBgColor} onChange={e => setStampBgColor(e.target.value)} placeholder="Match card colour" maxLength={7} className="flex-1 dark-input font-mono" />
          {stampBgColor && <button type="button" onClick={() => setStampBgColor('')} className="text-sm text-black/40 hover:text-black/70">Reset</button>}
        </div>
        <div className="flex items-center gap-3">
          <div className="w-20 h-12 rounded-xl shrink-0 overflow-hidden border border-black/10"
            style={{ background: cardBgUrl ? `url(${cardBgUrl}) center/cover` : (stampBgColor || brandColor) }} />
          <button type="button" onClick={() => bgInputRef.current?.click()}
            className="text-sm font-semibold text-black/60 border border-black/10 rounded-xl px-3 py-2 hover:bg-black/5 transition-colors">
            {bgUploading ? 'Uploading…' : cardBgUrl ? 'Replace image' : 'Upload image'}
          </button>
          {cardBgUrl && <button type="button" onClick={() => setCardBgUrl('')} className="text-sm text-black/40 hover:text-black/70 transition-colors">Remove image</button>}
        </div>
        <p className="text-xs text-black/30 mt-1.5">Set a colour or image to make the stamps stand out. An image takes priority.</p>
        <input ref={bgInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onBgChange} />
      </div>

      {/* Customer app preview */}
      <div>
        <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-2">Customer app preview</label>
        <div className="bg-[#F5F5F7] rounded-2xl p-5 border border-black/6">
          <div className="rounded-3xl p-4 shadow-lg flex flex-col gap-3.5" style={{ background: brandColor, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
            {/* Header — logo top-left + name */}
            <div className="flex items-center gap-2">
              {logoUrl ? <Image src={logoUrl} alt={vendorName} width={28} height={28} className="w-7 h-7 rounded-lg object-cover" unoptimized /> : null}
              <span className="text-[15px] font-bold truncate" style={{ color: onCard }}>{vendorName || 'Your Store'}</span>
            </div>

            {/* Stamp panel */}
            <div className="rounded-2xl p-3 relative overflow-hidden"
              style={{ background: cardBgUrl ? `url(${cardBgUrl}) center/cover` : (stampBgColor || brandColor) }}>
              {(!hasPanelColor && !cardBgUrl) && <div className="absolute inset-0" style={{ background: cardIsLight ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.16)' }} />}
              {cardBgUrl && <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.18)' }} />}
              <div className="relative flex flex-wrap gap-2.5 justify-center">
                {Array.from({ length: displayStamps }).map((_, i) => {
                  const filled = i < filledCount
                  return (
                    <span key={i} className="text-[26px] leading-none" style={filled ? {} : { filter: emptyFilter, opacity: 0.9 }}>{stampIcon}</span>
                  )
                })}
              </div>
            </div>

            {/* Footer — MEMBER / REWARDS */}
            <div className="flex items-start justify-between" style={{ color: onCard }}>
              <div>
                <p className="text-[10px] font-bold" style={{ opacity: 0.6 }}>MEMBER</p>
                <p className="text-[15px] font-semibold">Alex</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold" style={{ opacity: 0.6 }}>REWARDS</p>
                <p className="text-[15px] font-semibold">0 <span style={{ opacity: 0.6 }}>×</span> {stampIcon}</p>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-black/30 mt-3 text-center">{sampleRounds} of {roundsRequired} stamps · {rewardName || 'your reward'}</p>
        </div>
      </div>
    </div>
  )
}
