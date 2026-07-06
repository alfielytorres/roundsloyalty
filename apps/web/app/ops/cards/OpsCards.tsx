'use client'

import { useState } from 'react'
import CardPreview from '../../programs/CardPreview'

export interface CardData {
  id: string
  vendorName: string
  logoUrl: string
  brandHex: string
  stampBgHex: string
  cardBgUrl: string
  icon: string
  rounds: number
  rewardName: string
  frontUrl: string
  frontHeadline: string
  frontSubtext: string
  backMessage: string
  frontTextColor: string
  backTextColor: string
  stampColor: string
}

// Admin gallery: every vendor's loyalty card with the same flip + front/back
// export the vendor sees, so ops can make socials on their behalf.
export default function OpsCards({ vendors }: { vendors: CardData[] }) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const filtered = query ? vendors.filter((v) => v.vendorName.toLowerCase().includes(query)) : vendors

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search stores…"
        className="w-full dark-input mb-6"
      />
      {filtered.length === 0 ? (
        <p className="text-black/40 text-sm text-center py-12">No stores match “{q}”.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-10">
          {filtered.map((v) => (
            <div key={v.id}>
              <p className="text-[11px] font-semibold tracking-widest uppercase text-black/35 mb-2 truncate">{v.vendorName}</p>
              <CardPreview
                vendorName={v.vendorName}
                logoUrl={v.logoUrl}
                brandHex={v.brandHex}
                stampBgHex={v.stampBgHex}
                cardBgUrl={v.cardBgUrl}
                icon={v.icon}
                rounds={v.rounds}
                rewardName={v.rewardName}
                frontUrl={v.frontUrl}
                frontHeadline={v.frontHeadline}
                frontSubtext={v.frontSubtext}
                backMessage={v.backMessage}
                frontTextColor={v.frontTextColor}
                backTextColor={v.backTextColor}
                stampColor={v.stampColor}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
