'use client'

import { useRef, useState, useCallback, DragEvent, ChangeEvent } from 'react'
import Image from 'next/image'

interface Props {
  defaultLogoUrl: string
  defaultBrandColor: string
  vendorName: string
  rewardName: string
  roundsRequired: number
}

export default function BrandingEditor({ defaultLogoUrl, defaultBrandColor, vendorName, rewardName, roundsRequired }: Props) {
  const [logoUrl, setLogoUrl] = useState(defaultLogoUrl)
  const [brandColor, setBrandColor] = useState(defaultBrandColor || '#1D1D1F')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/settings/logo', { method: 'POST', body: fd })
    const json = await res.json()
    if (json.url) {
      setLogoUrl(json.url)
    } else {
      setUploadError(json.error ?? 'Upload failed')
    }
    setUploading(false)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(true) }, [])
  const onDragLeave = useCallback(() => setDragOver(false), [])

  // Sync hex text -> color state
  function onHexInput(val: string) {
    setBrandColor(val)
  }

  const sampleRounds = Math.min(Math.floor(roundsRequired * 0.6), roundsRequired - 1) || 3
  const progress = roundsRequired > 0 ? sampleRounds / roundsRequired : 0
  const remaining = roundsRequired - sampleRounds

  return (
    <div className="flex flex-col gap-6">
      {/* Logo upload */}
      <div>
        <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Logo</label>
        <input type="hidden" name="logo_url" value={logoUrl} />

        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`relative flex items-center gap-4 border-2 border-dashed rounded-2xl p-4 cursor-pointer transition-colors select-none
            ${dragOver ? 'border-black/40 bg-black/5' : 'border-black/10 bg-white/40 hover:bg-white/60 hover:border-black/20'}`}
        >
          {/* Logo preview */}
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

          {uploading && (
            <div className="shrink-0 w-5 h-5 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={onFileChange} />
      </div>

      {/* Brand colour */}
      <div>
        <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Brand colour</label>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer shrink-0 relative">
            <input
              type="color"
              value={brandColor.startsWith('#') && brandColor.length === 7 ? brandColor : '#1D1D1F'}
              onChange={e => { setBrandColor(e.target.value); }}
              className="sr-only"
            />
            <div
              className="w-10 h-10 rounded-xl border border-black/10 shadow-sm"
              style={{ backgroundColor: brandColor }}
            />
          </label>
          <input
            name="brand_color_text"
            value={brandColor}
            onChange={e => onHexInput(e.target.value)}
            placeholder="#1D1D1F"
            maxLength={7}
            className="flex-1 dark-input font-mono"
          />
        </div>

        {/* Colour swatches */}
        <div className="flex gap-2 mt-2 flex-wrap">
          {['#E53935','#8E24AA','#1E88E5','#00ACC1','#43A047','#F4511E','#F9A825','#3949AB','#1D1D1F'].map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setBrandColor(c)}
              className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 ${brandColor === c ? 'border-black/50 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* iOS card preview */}
      <div>
        <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-2">Customer app preview</label>
        <div className="bg-[#F5F5F7] rounded-2xl p-4 border border-black/6">
          <p className="text-[10px] font-semibold text-black/25 tracking-widest uppercase mb-3">YOUR ROUNDS</p>

          {/* Loyalty card — mirrors iOS VendorCard (featured) */}
          <div
            className="rounded-3xl p-4 border border-white shadow-md"
            style={{
              background: 'rgba(255,255,255,0.82)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
              height: 190,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Top row */}
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <Image src={logoUrl} alt={vendorName} width={20} height={20} className="w-5 h-5 rounded object-contain" unoptimized />
              ) : null}
              <span className="text-[12px] font-medium text-black/40 truncate">{vendorName || 'Your Store'}</span>
            </div>

            {/* Big number */}
            <div className="flex-1 flex items-end pb-1">
              <div>
                <span className="font-black text-[64px] leading-none text-[#1D1D1F]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {sampleRounds}
                </span>
                <p className="text-[11px] font-medium text-black/28 -mt-1">rounds</p>
              </div>
            </div>

            {/* Progress bar + label */}
            <div className="mt-auto">
              <div className="h-[3px] rounded-full bg-black/8 overflow-hidden mb-1.5">
                <div className="h-full rounded-full bg-black/50 transition-all" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="text-[11px] text-black/35">
                {remaining > 0 ? `${remaining} more for ${rewardName || 'your reward'}` : `Ready: ${rewardName || 'your reward'}`}
              </p>
            </div>
          </div>

          {/* Reward card — mirrors iOS RewardCard */}
          <p className="text-[10px] font-semibold text-black/25 tracking-widest uppercase mt-4 mb-2">READY TO COLLECT</p>
          <div className="flex items-center gap-3 bg-white/80 rounded-2xl p-3.5 border border-white shadow-sm">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: brandColor + '26' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" style={{ color: brandColor }}>
                <path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" stroke="currentColor" strokeWidth="0" fill="currentColor" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-black/40">{vendorName || 'Your Store'}</p>
              <p className="text-[14px] font-semibold text-[#1D1D1F] truncate">{rewardName || 'Your Reward'}</p>
            </div>
            <span className="text-[12px] font-semibold shrink-0" style={{ color: brandColor }}>Tap to collect</span>
          </div>
        </div>
      </div>
    </div>
  )
}
