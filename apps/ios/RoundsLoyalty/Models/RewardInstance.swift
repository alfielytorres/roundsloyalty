import Foundation

struct RewardInstance: Codable, Identifiable {
    let id: UUID
    let customerId: UUID
    let vendorId: UUID
    let rewardName: String
    let rewardDescription: String?
    let status: String // available, collection_requested, ready, collected, expired, cancelled
    let expiresAt: Date?
    let createdAt: Date
    var vendor: Vendor?
    var collection: RewardCollection?

    enum CodingKeys: String, CodingKey {
        case id
        case customerId = "customer_id"
        case vendorId = "vendor_id"
        case rewardName = "reward_name"
        case rewardDescription = "reward_description"
        case status
        case expiresAt = "expires_at"
        case createdAt = "created_at"
        case vendor = "vendors"
        case collection = "reward_collections"
    }
}
