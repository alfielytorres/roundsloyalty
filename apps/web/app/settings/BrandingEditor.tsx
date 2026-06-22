'use client'

import { useRef, useState, useCallback, DragEvent, ChangeEvent } from 'react'
import Image from 'next/image'

interface Props {
  defaultLogoUrl: string
  defaultBrandColor: string
  defaultStampIcon?: string
  defaultCardBackgroundUrl?: string
  vendorName: string
  rewardName: string
  roundsRequired: number
}

const STAMP_ICONS = ['☕', '🥐', '🍩', '🍪', '🍞', '🧋', '🍕', '🍔', '🌮', '🍦', '🍰', '🧁', '🍺', '🍷', '⭐', '❤️', '🎁', '🌟']

export default function BrandingEditor({
  defaultLogoUrl, defaultBrandColor, defaultStampIcon = '☕', defaultCardBackgroundUrl = '',
  vendorName, rewardName, roundsRequired,
}: Props) {
  const [logoUrl, setLogoUrl] = useState(defaultLogoUrl)
  const [brandColor, setBrandColor] = useState(defaultBrandColor || '#1D1D1F')
  const [stampIcon, setStampIcon] = useState(defaultStampIcon || '☕')
  const [cardBgUrl, setCardBgUrl] = useState(defaultCardBackgroundUrl)
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

  async function uploadLogo(file: File) {
    setUploading(true); setUploadError(null)
    const url = await upload(file, 'logo')
    if (url) setLogoUrl(url)
    setUploading(false)
  }

  async function uploadBackground(file: File) {
    setBgUploading(true); setUploadError(null)
    const url = await upload(file, 'card-bg')
    if (url) setCardBgUrl(url)
    setBgUploading(false)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadLogo(file)
  }
  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(true) }, [])
  const onDragLeave = useCallback(() => setDragOver(false), [])
  function onLogoChange(e: ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) uploadLogo(f) }
  function onBgChange(e: ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) uploadBackground(f) }

  // Preview a partially-filled card.
  const displayStamps = Math.min(roundsRequired || 1, 10)
  const sampleRounds = Math.min(Math.floor(roundsRequired * 0.6), roundsRequired - 1) || 3
  const filledCount = Math.min(sampleRounds, displayStamps)
  const remaining = roundsRequired - sampleRounds

  return (
    <div className="flex flex-col gap-6">
      {/* Hidden inputs submitted with the program form */}
      <input type="hidden" name="logo_url" value={logoUrl} />
      <input type="hidden" name="brand_color_text" value={brandColor} />
      <input type="hidden" name="stamp_icon" value={stampIcon} />
      <input type="hidden" name="card_background_url" value={cardBgUrl} />

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

      {/* Brand colour */}
      <div>
        <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Brand colour</label>
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

      {/* Card background */}
      <div>
        <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Card background</label>
        <div className="flex items-center gap-3">
          <div className="w-20 h-12 rounded-xl shrink-0 overflow-hidden border border-black/10 bg-cover bg-center"
            style={{ background: cardBgUrl ? `url(${cardBgUrl}) center/cover` : brandColor }} />
          <button type="button" onClick={() => bgInputRef.current?.click()}
            className="text-sm font-semibold text-black/60 border border-black/10 rounded-xl px-3 py-2 hover:bg-black/5 transition-colors">
            {bgUploading ? 'Uploading…' : cardBgUrl ? 'Replace image' : 'Upload image'}
          </button>
          {cardBgUrl && (
            <button type="button" onClick={() => setCardBgUrl('')} className="text-sm text-black/40 hover:text-black/70 transition-colors">Remove</button>
          )}
        </div>
        <p className="text-xs text-black/30 mt-1.5">Optional — shown behind the stamps. Falls back to your brand colour.</p>
        <input ref={bgInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onBgChange} />
      </div>

      {/* Customer app preview */}
      <div>
        <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-2">Customer app preview</label>
        <div className="bg-[#F5F5F7] rounded-2xl p-4 border border-black/6">
          <p className="text-[10px] font-semibold text-black/25 tracking-widest uppercase mb-3">YOUR ROUNDS</p>

          <div className="rounded-3xl p-4 border border-white shadow-md flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
            {/* Header */}
            <div className="flex items-center gap-2">
              {logoUrl ? <Image src={logoUrl} alt={vendorName} width={20} height={20} className="w-5 h-5 rounded object-contain" unoptimized /> : null}
              <span className="text-[13px] font-semibold text-[#1D1D1F] truncate">{vendorName || 'Your Store'}</span>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: remaining > 0 ? 'transparent' : brandColor, color: remaining > 0 ? 'transparent' : '#fff' }}>
                {remaining > 0 ? '' : 'READY'}
              </span>
            </div>

            {/* Stamp panel */}
            <div className="rounded-2xl p-3" style={{ background: cardBgUrl ? `url(${cardBgUrl}) center/cover` : brandColor }}>
              <div className="flex flex-wrap gap-2 justify-center">
                {Array.from({ length: displayStamps }).map((_, i) => {
                  const filled = i < filledCount
                  return (
                    <div key={i} className="flex items-center justify-center rounded-full"
                      style={{ width: 34, height: 34, background: filled ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.22)' }}>
                      <span style={{ fontSize: 17, filter: filled ? 'none' : 'grayscale(1)', opacity: filled ? 1 : 0.5 }}>{stampIcon}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#1D1D1F]">{sampleRounds} / {roundsRequired}</span>
              <span className="text-[11px]" style={{ color: remaining > 0 ? 'rgba(0,0,0,0.4)' : brandColor }}>
                {remaining > 0 ? `${remaining} more for ${rewardName || 'your reward'}` : `Ready: ${rewardName || 'your reward'}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
