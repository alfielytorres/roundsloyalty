export type UserRole = 'customer' | 'vendor'

export interface Profile {
  id: string
  role: UserRole
  display_name: string | null
  avatar_url: string | null
  expo_push_token: string | null
  created_at: string
}

// New schema types
export interface Vendor {
  id: string
  owner_id: string
  business_name: string
  description: string | null
  category: string | null
  status: 'active' | 'suspended' | 'pending'
  brand_color: string | null
  proof_of_purchase_enabled: boolean
  proof_of_purchase_instructions: string | null
  proof_of_purchase_max_claim_age_days: number | null
  created_at: string
}

export interface StoreLocation {
  id: string
  vendor_id: string
  address: string | null
  lat: number | null
  lng: number | null
  is_primary: boolean
}

export interface CustomerVendorMembership {
  id: string
  customer_id: string
  vendor_id: string
  membership_token: string
  status: 'pending' | 'active' | 'inactive' | 'banned'
  joined_at: string
  activated_at: string | null
}

export interface LoyaltyBalance {
  id: string
  membership_id: string
  stamps_collected: number
  points_accumulated: number
  tier: string | null
  total_visits: number
  last_active_at: string | null
}

export type LedgerEventType =
  | 'stamp_added'
  | 'points_added'
  | 'reward_redeemed'
  | 'transaction_voided'
  | 'joined'
  | 'activated'
  | 'new_customer_reward'

export interface LoyaltyLedgerEntry {
  id: string
  membership_id: string
  vendor_id: string
  event_type: LedgerEventType
  delta: number
  balance_after: number
  notes: string | null
  created_at: string
}

export type ProgramType = 'stamp' | 'points' | 'tiered'

export interface LoyaltyProgram {
  id: string
  vendor_id: string
  name: string
  program_type: ProgramType
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
}

export interface RewardRule {
  id: string
  program_id: string
  name: string
  description: string | null
  stamp_threshold: number | null
  points_threshold: number | null
  reward_type: string
  is_active: boolean
}

export interface RewardInstance {
  id: string
  membership_id: string
  reward_rule_id: string
  status: 'pending' | 'redeemed' | 'expired' | 'voided'
  issued_at: string
  redeemed_at: string | null
}

export interface ProofOfPurchaseClaim {
  id: string
  customer_id: string
  vendor_id: string
  amount: number | null
  description: string | null
  status: 'pending' | 'approved' | 'rejected'
  notes: string | null
  created_at: string
}
