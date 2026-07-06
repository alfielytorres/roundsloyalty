'use client'

import { useRef, useState } from 'react'
import { toJpeg } from 'html-to-image'
import { RefreshCw, Share2 } from 'lucide-react'
import { lum } from './colorUtils'

interface Props {
  vendorName: string
  logoUrl: string
  brandHex: string
  stampBgHex: string
  cardBgUrl: string          // back stamp-panel background
  icon: string
  rounds: number
  rewardName: string
  frontUrl?: string          // front full-bleed art
  frontHeadline?: string
  frontSubtext?: string
  backMessage?: string
}

// Most balanced grid width for n stamps (columns >= rows).
export function gridColumns(n: number): number {
  if (n <= 1) return 1
  let cols = n
  let bestDiff = Infinity
  for (let r = 1; r * r <= n; r++) {
    if (n % r === 0) {
      const c = n / r
      if (c - r < bestDiff) { bestDiff = c - r; cols = c }
    }
  }
  if (cols === n && n >= 7) {
    const rows = Math.floor(Math.sqrt(n))
    cols = Math.ceil(n / rows)
  }
  return cols
}

// One face of the card. All sizes are in cqw so the same markup renders small in
// the responsive preview and crisp in the fixed-width off-screen export.
function CardFace({ side, p }: { side: 'front' | 'back'; p: Props }) {
  const onCard = lum(p.brandHex) > 0.179 ? '#1D1D1F' : '#ffffff'
  const total = Math.max(1, p.rounds || 1)
  const display = Math.min(total, 20)
  const sample = Math.min(Math.floor(total * 0.6), total - 1) || Math.min(3, display)
  const filled = Math.min(sample, display)
  const cols = gridColumns(display)
  const hasPanel = !!p.stampBgHex
  const panelHex = p.stampBgHex || p.brandHex
  const emptyIsWhite = p.cardBgUrl ? true : lum(panelHex) <= 0.179
  const emptyFilter = emptyIsWhite ? 'brightness(0) invert(1)' : 'brightness(0)'
  const sticker = 'drop-shadow(0 0 0.4cqw #fff) drop-shadow(0 0 0.4cqw #fff) drop-shadow(0 0.4cqw 0.3cqw rgba(0,0,0,0.28))'

  const shell: React.CSSProperties = {
    aspectRatio: '1.586 / 1',
    borderRadius: '6cqw',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 3cqw 6cqw rgba(0,0,0,0.22)',
    color: onCard,
  }
  const sheen = <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(150deg, rgba(255,255,255,0.22), transparent 42%)', pointerEvents: 'none' }} />

  if (side === 'front') {
    const bg = p.frontUrl ? `url(${p.frontUrl}) center/cover` : `linear-gradient(150deg, ${p.brandHex}, ${shade(p.brandHex, -22)})`
    const overlayText = p.frontHeadline || p.frontSubtext || !p.frontUrl
    const ink = p.frontUrl ? '#fff' : onCard
    return (
      <div style={{ ...shell, background: bg }}>
        {p.frontUrl && overlayText && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.34), transparent 34%, transparent 62%, rgba(0,0,0,0.42))' }} />
        )}
        {sheen}
        <div style={{ position: 'absolute', inset: 0, padding: '6cqw', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2.4cqw' }}>
            {p.logoUrl && (
              <span style={{ width: '11cqw', height: '11cqw', borderRadius: '3cqw', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.logoUrl} alt="" crossOrigin="anonymous" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '1cqw' }} />
              </span>
            )}
            <span style={{ fontSize: '5cqw', fontWeight: 800, color: ink, letterSpacing: '-0.02em', textShadow: p.frontUrl ? '0 0.3cqw 1cqw rgba(0,0,0,0.4)' : 'none' }}>
              {p.frontHeadline || p.vendorName || 'Your Store'}
            </span>
          </div>
          <div>
            {p.frontSubtext ? (
              <p style={{ fontSize: '4cqw', fontWeight: 600, color: ink, opacity: 0.92, textShadow: p.frontUrl ? '0 0.3cqw 1cqw rgba(0,0,0,0.5)' : 'none' }}>{p.frontSubtext}</p>
            ) : !p.frontUrl ? (
              <p style={{ fontSize: '3.4cqw', fontWeight: 600, color: ink, opacity: 0.7 }}>Loyalty card</p>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  // BACK
  return (
    <div style={{ ...shell, background: `linear-gradient(150deg, ${p.brandHex}, ${shade(p.brandHex, -22)})` }}>
      {sheen}
      <div style={{ position: 'absolute', inset: 0, padding: '5.5cqw', display: 'flex', flexDirection: 'column', gap: '3cqw' }}>
        <p style={{ fontSize: '3.8cqw', fontWeight: 700, letterSpacing: '0.02em', textAlign: 'center', opacity: 0.92 }}>
          {p.backMessage || `Collect ${total} for ${p.rewardName || 'a reward'}`}
        </p>
        <div style={{ flex: 1, borderRadius: '4cqw', position: 'relative', overflow: 'hidden', background: p.cardBgUrl ? `url(${p.cardBgUrl}) center/cover` : panelHex, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {(!hasPanel && !p.cardBgUrl) && <div style={{ position: 'absolute', inset: 0, background: lum(panelHex) > 0.4 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)' }} />}
          {p.cardBgUrl && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)' }} />}
          <div style={{ position: 'relative', display: 'grid', gap: '2.4cqw', gridTemplateColumns: `repeat(${cols}, minmax(0, auto))`, padding: '3cqw', transform: 'rotate(-1.5deg)' }}>
            {Array.from({ length: display }).map((_, i) => (
              <span key={i} style={{
                fontSize: '5.6cqw', lineHeight: 1, textAlign: 'center',
                transform: `rotate(${((i * 37) % 13) - 6}deg)`,
                ...(i < filled
                  ? { filter: sticker }
                  : { filter: `${emptyFilter} drop-shadow(0 0 0.2cqw rgba(255,255,255,0.85))`, opacity: 0.45 }),
              }}>{p.icon}</span>
            ))}
          </div>
        </div>
        <p style={{ fontSize: '3.2cqw', fontWeight: 600, textAlign: 'center', opacity: 0.85 }}>
          {p.rewardName ? `${sample}/${total} · ${p.rewardName} on us` : 'Collect stamps for a free reward'}
        </p>
      </div>
    </div>
  )
}

export default function CardPreview(props: Props) {
  const [side, setSide] = useState<'front' | 'back'>('front')
  const [busy, setBusy] = useState(false)
  const frontRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)

  async function shareSide(which: 'front' | 'back') {
    const node = (which === 'front' ? frontRef : backRef).current
    if (!node || busy) return
    setBusy(true)
    try {
      const dataUrl = await toJpeg(node, { quality: 0.95, pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' })
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], `${(props.vendorName || 'card').replace(/\s+/g, '-').toLowerCase()}-${which}.jpg`, { type: 'image/jpeg' })
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: `${props.vendorName} loyalty card` }).catch(() => {})
      } else {
        const a = document.createElement('a'); a.href = dataUrl; a.download = file.name; a.click()
      }
    } catch { /* ignore */ } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Interactive card — click to flip */}
      <div style={{ containerType: 'inline-size' }} className="w-full max-w-[360px] mx-auto cursor-pointer select-none"
        onClick={() => setSide(s => (s === 'front' ? 'back' : 'front'))}>
        <CardFace side={side} p={props} />
      </div>

      <div className="flex items-center justify-center gap-2">
        <button type="button" onClick={() => setSide(s => (s === 'front' ? 'back' : 'front'))}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/50 hover:text-black/80 rounded-xl px-3 py-2 border border-black/10 hover:bg-black/5 transition-colors">
          <RefreshCw size={13} /> {side === 'front' ? 'Show back' : 'Show front'}
        </button>
        <button type="button" onClick={() => shareSide(side)} disabled={busy}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white btn-primary !px-3 !py-2 !rounded-xl disabled:opacity-60">
          <Share2 size={13} /> {busy ? 'Exporting…' : `Share ${side}`}
        </button>
      </div>
      <p className="text-[11px] text-black/35 text-center">Tap the card to flip · share exports a JPEG for socials</p>

      {/* Off-screen full-size faces used for export */}
      <div style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none' }} aria-hidden>
        <div style={{ containerType: 'inline-size', width: 1080 }}><div ref={frontRef}><CardFace side="front" p={props} /></div></div>
        <div style={{ containerType: 'inline-size', width: 1080 }}><div ref={backRef}><CardFace side="back" p={props} /></div></div>
      </div>
    </div>
  )
}

// Darken/lighten a hex by pct (negative darkens) for the card gradient.
function shade(hex: string, pct: number): string {
  const s = hex.replace('#', '')
  if (s.length !== 6) return hex
  const n = parseInt(s, 16)
  const adj = (c: number) => Math.max(0, Math.min(255, Math.round(c + (c * pct) / 100)))
  const r = adj((n >> 16) & 0xff), g = adj((n >> 8) & 0xff), b = adj(n & 0xff)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
