import type { LoyaltyCard, LoyaltyProgram, StampProgramConfig, TieredProgramConfig } from '@rounds/types'

export function getProgressLabel(card: LoyaltyCard, program: LoyaltyProgram): string {
  const config = program.config
  if (config.type === 'stamp') {
    const cfg = config as StampProgramConfig
    const remaining = cfg.stamps_required - card.stamps_collected
    if (remaining <= 0) return 'Reward ready!'
    return `${card.stamps_collected} / ${cfg.stamps_required} stamps`
  }
  if (config.type === 'points') {
    return `${card.points_accumulated} points`
  }
  if (config.type === 'tiered') {
    const cfg = config as TieredProgramConfig
    const tier = card.tier ?? cfg.tiers[0]?.name ?? 'Bronze'
    return tier
  }
  return ''
}

export function getProgressPercent(card: LoyaltyCard, program: LoyaltyProgram): number {
  const config = program.config
  if (config.type === 'stamp') {
    const cfg = config as StampProgramConfig
    return Math.min(card.stamps_collected / cfg.stamps_required, 1)
  }
  return 0
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function isAtRisk(lastVisit: string | null, thresholdDays = 30): boolean {
  if (!lastVisit) return false
  const date = new Date(lastVisit)
  const now = new Date()
  const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= thresholdDays
}
