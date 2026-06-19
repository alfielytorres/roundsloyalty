import Foundation

struct RewardCollection: Codable, Identifiable {
    let id: UUID
    let rewardInstanceId: UUID
    let collectionCode: String
    let status: String // requested, ready, collected, cancelled
    let requestedAt: Date
    let readyAt: Date?
    let collectedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case rewardInstanceId = "reward_instance_id"
        case collectionCode = "collection_code"
        case status
        case requestedAt = "requested_at"
        case readyAt = "ready_at"
        case collectedAt = "collected_at"
    }
}
