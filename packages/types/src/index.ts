export type UserRole = 'customer' | 'vendor'

export type LoyaltyProgramType = 'stamp' | 'points' | 'tiered'

export interface Profile {
  id: string
  role: UserRole
  display_name: string | null
  avatar_url: string | null
  expo_push_token: string | null
  created_at: string
}

export interface Business {
  id: string
  owner_id: string
  name: string
  description: string | null
  logo_url: string | null
  address: string | null
  lat: number | null
  lng: number | null
  qr_code_secret: string
  created_at: string
}

export interface StampProgramConfig {
  type: 'stamp'
  stamps_required: number
  reward: string
}

export interface PointsProgramConfig {
  type: 'points'
  points_per_visit: number
  rewards: Array<{ points: number; label: string }>
}

export interface Tier {
  name: string
  min_visits: number
  reward?: string
}

export interface TieredProgramConfig {
  type: 'tiered'
  tiers: Tier[]
}

export type LoyaltyProgramConfig =
  | StampProgramConfig
  | PointsProgramConfig
  | TieredProgramConfig

export interface LoyaltyProgram {
  id: string
  business_id: string
  type: LoyaltyProgramType
  config: LoyaltyProgramConfig
  reward_description: string | null
  is_active: boolean
  created_at: string
}

export interface LoyaltyCard {
  id: string
  customer_id: string
  program_id: string
  stamps_collected: number
  points_accumulated: number
  tier: string | null
  wallet_pass_id: string | null
  last_visit: string | null
  created_at: string
}

export interface VisitEvent {
  id: string
  card_id: string
  business_id: string
  stamps_added: number
  points_added: number
  vendor_device_id: string | null
  created_at: string
}

export interface Redemption {
  id: string
  card_id: string
  redeemed_at: string
  notes: string | null
}

export type OfferSegment = 'all' | 'returning' | 'at_risk' | 'top'

export interface Offer {
  id: string
  business_id: string
  title: string
  body: string
  target_segment: OfferSegment
  sent_at: string | null
  created_at: string
}

export interface OfferRecipient {
  id: string
  offer_id: string
  customer_id: string
  delivered_at: string | null
  opened_at: string | null
}

export interface DataConsent {
  id: string
  customer_id: string
  business_id: string
  consented_at: string
  withdrawn_at: string | null
}

export interface QRPayload {
  business_id: string
  timestamp: number
  nonce: string
  hmac: string
}

export interface StampCardResult {
  card: LoyaltyCard
  stamps_added: number
  reward_unlocked: boolean
  business: Pick<Business, 'id' | 'name' | 'logo_url'>
}
