import Foundation

enum RewardStatus: String, Codable {
    case available
    case redeemed
    case expired
    case voided
}

struct RewardInstance: Codable, Identifiable {
    let id: UUID
    let customerId: UUID
    let vendorId: UUID
    let status: RewardStatus
    let rewardName: String?
    let rewardDescription: String?
    let earnedAt: Date?
    let redeemedAt: Date?
    let expiresAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case customerId = "customer_id"
        case vendorId = "vendor_id"
        case status
        case rewardName = "reward_name"
        case rewardDescription = "reward_description"
        case earnedAt = "earned_at"
        case redeemedAt = "redeemed_at"
        case expiresAt = "expires_at"
    }
}
