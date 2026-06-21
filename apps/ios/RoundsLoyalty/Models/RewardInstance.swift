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
    var vendors: [Vendor]?
    var collections: [RewardCollection]?

    var vendor: Vendor? { vendors?.first }
    var collection: RewardCollection? { collections?.first }

    enum CodingKeys: String, CodingKey {
        case id
        case customerId = "customer_id"
        case vendorId = "vendor_id"
        case rewardName = "reward_name"
        case rewardDescription = "reward_description"
        case status
        case expiresAt = "expires_at"
        case createdAt = "created_at"
        case vendors
        case collections = "reward_collections"
    }
}
