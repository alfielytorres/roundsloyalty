'use client'

import Image from 'next/image'
import { lum } from './colorUtils'

interface Props {
  vendorName: string
  logoUrl: string
  brandHex: string
  stampBgHex: string
  cardBgUrl: string
  icon: string
  rounds: number
  rewardName: string
}

// Live loyalty card — mirrors the iOS LoyaltyCardView exactly.
export default function CardPreview({ vendorName, logoUrl, brandHex, stampBgHex, cardBgUrl, icon, rounds, rewardName }: Props) {
  const cardL = lum(brandHex)
  const onCard = cardL > 0.179 ? '#1D1D1F' : '#ffffff'
  const overlayDark = cardL > 0.4
  const hasPanel = !!stampBgHex
  const panelHex = stampBgHex || brandHex
  const emptyIsWhite = cardBgUrl ? true : lum(panelHex) <= 0.179
  const emptyFilter = emptyIsWhite ? 'brightness(0) invert(1)' : 'brightness(0)'

  const total = Math.max(1, rounds || 1)
  const display = Math.min(total, 10)
  const sample = Math.min(Math.floor(total * 0.6), total - 1) || Math.min(3, display)
  const filled = Math.min(sample, display)

  // Die-cut "sticker" look: stacked white outlines + a soft drop shadow.
  const sticker = 'drop-shadow(0 0 1px #fff) drop-shadow(0 0 1px #fff) drop-shadow(0 0 1px #fff) drop-shadow(0 1.5px 1px rgba(0,0,0,0.28))'

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-3xl p-4 flex flex-col gap-3.5 transition-colors" style={{ background: brandHex, boxShadow: '0 10px 30px rgba(0,0,0,0.18)' }}>
        {/* Header — logo top-left + name */}
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
              <Image src={logoUrl} alt={vendorName} width={28} height={28} className="max-w-full max-h-full object-contain p-px" unoptimized />
            </span>
          ) : null}
          <span className="text-[15px] font-bold truncate" style={{ color: onCard }}>{vendorName || 'Your Store'}</span>
        </div>

        {/* Stamp panel */}
        <div className="rounded-2xl p-3 relative overflow-hidden transition-colors" style={{ background: cardBgUrl ? `url(${cardBgUrl}) center/cover` : panelHex }}>
          {(!hasPanel && !cardBgUrl) && <div className="absolute inset-0" style={{ background: overlayDark ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.16)' }} />}
          {cardBgUrl && <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.18)' }} />}
          <div className="relative flex flex-wrap gap-2.5 justify-center">
            {Array.from({ length: display }).map((_, i) => (
              <span key={i} className={`text-[26px] leading-none ${i < filled ? 'stamp-pop' : ''}`}
                style={i < filled
                  ? { filter: sticker, animationDelay: `${i * 45}ms` }
                  : { filter: `${emptyFilter} drop-shadow(0 0 0.6px rgba(255,255,255,0.85))`, opacity: 0.5 }}>{icon}</span>
            ))}
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
            <p className="text-[15px] font-semibold">0 <span style={{ opacity: 0.6 }}>×</span> {icon}</p>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-black/35 text-center">{sample} of {total} stamps · {rewardName || 'your reward'}</p>
    </div>
  )
}
