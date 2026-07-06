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
  frontTextColor?: string    // '', 'dark', 'light' — '' = auto contrast
  backTextColor?: string
}

// Resolve a per-side text-colour choice to a hex, falling back to auto.
function inkFor(choice: string | undefined, auto: string): string {
  return choice === 'dark' ? '#1D1D1F' : choice === 'light' ? '#ffffff' : auto
}

// Grid width for n stamps. Keep it to at most two rows (the card caps at 10);
// a single row up to 5, otherwise split across two rows. Rows needn't be equal.
export function gridColumns(n: number): number {
  if (n <= 5) return Math.max(1, n)
  return Math.ceil(n / 2)
}

// A wobbly, organic border-radius so a stamp reads as a hand-pressed circle
// rather than a perfect die-cut. Deterministic per index.
function organicRadius(i: number): string {
  const a = 44 + ((i * 13) % 22)
  const c = 44 + ((i * 29) % 22)
  const e = 45 + ((i * 17) % 18)
  const g = 45 + ((i * 23) % 18)
  return `${a}% ${100 - a}% ${c}% ${100 - c}% / ${e}% ${100 - e}% ${g}% ${100 - g}%`
}

// Speckle a solid ink disc with little holes of the panel colour to fake the
// patchy, ink-starved look of a real rubber stamp. Deterministic per index.
function grungeDisc(i: number, ink: string, panel: string): string {
  const holes = [0, 1, 2, 3, 4].map(k => {
    const hx = 14 + (((i + 1) * (k * 29 + 13)) % 72)
    const hy = 14 + (((i + 1) * (k * 37 + 17)) % 72)
    const r = 2 + ((i + k) % 3)
    return `radial-gradient(circle at ${hx}% ${hy}%, ${panel} 0 ${r}%, transparent ${r + 1.2}%)`
  })
  return `${holes.join(', ')}, ${ink}`
}

// One face of the card. All sizes are in cqw so the same markup renders small in
// the responsive preview and crisp in the fixed-width off-screen export.
function CardFace({ side, p, bleed = false }: { side: 'front' | 'back'; p: Props; bleed?: boolean }) {
  const onCard = lum(p.brandHex) > 0.179 ? '#1D1D1F' : '#ffffff'
  const total = Math.max(1, p.rounds || 1)
  const display = Math.min(total, 10)   // card shows at most 10 stamps
  const sample = Math.min(Math.floor(total * 0.6), total - 1) || Math.min(3, display)
  const filled = Math.min(sample, display)
  const cols = gridColumns(display)
  const hasPanel = !!p.stampBgHex
  const panelHex = p.stampBgHex || p.brandHex
  const emptyIsWhite = p.cardBgUrl ? true : lum(panelHex) <= 0.179

  // In export ("bleed") mode the card fills the frame edge-to-edge with no
  // rounded corners or shadow, so the JPEG is all card and no white margin.
  const shell: React.CSSProperties = {
    aspectRatio: '1.586 / 1',
    borderRadius: bleed ? 0 : '6cqw',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: bleed ? 'none' : '0 3cqw 6cqw rgba(0,0,0,0.22)',
    color: onCard,
  }

  if (side === 'front') {
    const bg = p.frontUrl ? `url(${p.frontUrl}) center/cover` : p.brandHex
    const overlayText = p.frontHeadline || p.frontSubtext || !p.frontUrl
    const ink = inkFor(p.frontTextColor, p.frontUrl ? '#fff' : onCard)
    return (
      <div style={{ ...shell, background: bg }}>
        {p.frontUrl && overlayText && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.34), transparent 34%, transparent 62%, rgba(0,0,0,0.42))' }} />
        )}
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
  const backInk = inkFor(p.backTextColor, onCard)
  const stampInk = emptyIsWhite ? '#ffffff' : '#1D1D1F'   // disc ink
  const knockout = emptyIsWhite ? 'brightness(0)' : 'brightness(0) invert(1)'   // icon reversed out of the ink
  const seal = display > 8 ? 13 : 15   // cqw per stamp
  return (
    <div style={{ ...shell, background: p.brandHex }}>
      <div style={{ position: 'absolute', inset: 0, padding: '5.5cqw', display: 'flex', flexDirection: 'column', gap: '3cqw' }}>
        <p style={{ fontSize: '3.8cqw', fontWeight: 700, letterSpacing: '0.02em', textAlign: 'center', opacity: 0.92, color: backInk }}>
          {p.backMessage || `Collect ${total} for ${p.rewardName || 'a reward'}`}
        </p>
        <div style={{ flex: 1, borderRadius: '4cqw', position: 'relative', overflow: 'hidden', background: p.cardBgUrl ? `url(${p.cardBgUrl}) center/cover` : panelHex, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {(!hasPanel && !p.cardBgUrl) && <div style={{ position: 'absolute', inset: 0, background: lum(panelHex) > 0.4 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)' }} />}
          {p.cardBgUrl && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)' }} />}
          {/* Ink-stamp impressions: a soft blob waits for a stamp; earned slots are a
              solid inked disc with the icon knocked out, speckled and wobbled so it
              reads like a real, slightly grungy rubber stamp. */}
          <div style={{ position: 'relative', display: 'grid', gap: '2.8cqw', gridTemplateColumns: `repeat(${cols}, ${seal}cqw)`, padding: '2cqw', transform: 'rotate(-1.5deg)' }}>
            {Array.from({ length: display }).map((_, i) => {
              const isFilled = i < filled
              const rot = ((i * 37) % 13) - 6
              if (!isFilled) {
                return (
                  <div key={i} style={{
                    width: `${seal}cqw`, height: `${seal}cqw`, borderRadius: organicRadius(i),
                    background: stampInk, opacity: 0.2, transform: `rotate(${rot}deg)`,
                  }} />
                )
              }
              return (
                <div key={i} style={{
                  width: `${seal}cqw`, height: `${seal}cqw`, borderRadius: organicRadius(i), boxSizing: 'border-box',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: grungeDisc(i, stampInk, panelHex),
                  opacity: 0.92,
                  transform: `rotate(${rot}deg)`,
                }}>
                  <span style={{ fontSize: `${seal * 0.5}cqw`, lineHeight: 1, filter: knockout }}>{p.icon}</span>
                </div>
              )
            })}
          </div>
        </div>
        <p style={{ fontSize: '3.2cqw', fontWeight: 600, textAlign: 'center', opacity: 0.85, color: backInk }}>
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
      const dataUrl = await toJpeg(node, { quality: 0.95, pixelRatio: 2, cacheBust: true, backgroundColor: props.brandHex || '#ffffff' })
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
      {/* Interactive card — click for a 3D left-to-right flip */}
      <div style={{ containerType: 'inline-size', perspective: '1400px' }} className="w-full max-w-[360px] mx-auto cursor-pointer select-none"
        onClick={() => setSide(s => (s === 'front' ? 'back' : 'front'))}>
        <div style={{
          position: 'relative', aspectRatio: '1.586 / 1',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s cubic-bezier(0.4, 0.15, 0.2, 1)',
          transform: side === 'back' ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
            <CardFace side="front" p={props} />
          </div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <CardFace side="back" p={props} />
          </div>
        </div>
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
        <div style={{ containerType: 'inline-size', width: 1080 }}><div ref={frontRef}><CardFace side="front" p={props} bleed /></div></div>
        <div style={{ containerType: 'inline-size', width: 1080 }}><div ref={backRef}><CardFace side="back" p={props} bleed /></div></div>
      </div>
    </div>
  )
}
