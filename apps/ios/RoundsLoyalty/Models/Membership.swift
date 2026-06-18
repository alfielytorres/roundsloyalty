import Foundation

enum MembershipStatus: String, Codable {
    case pending
    case active
    case inactive
}

struct Membership: Codable, Identifiable {
    let id: UUID
    let customerId: UUID
    let vendorId: UUID
    let status: MembershipStatus
    let membershipToken: String?
    let joinedAt: Date?
    let activatedAt: Date?
    var loyaltyBalance: LoyaltyBalance?
    var rewardInstances: [RewardInstance]?
    var vendor: Vendor?

    enum CodingKeys: String, CodingKey {
        case id
        case customerId = "customer_id"
        case vendorId = "vendor_id"
        case status
        case membershipToken = "membership_token"
        case joinedAt = "joined_at"
        case activatedAt = "activated_at"
        case loyaltyBalance = "loyalty_balances"
        case rewardInstances = "reward_instances"
        case vendor = "vendors"
    }
}
