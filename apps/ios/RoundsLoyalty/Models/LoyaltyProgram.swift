import Foundation

enum LoyaltyProgramType: String, Codable {
    case stamp
    case points
    case tiered
}

struct LoyaltyProgram: Codable, Identifiable {
    let id: UUID
    let businessId: UUID
    let type: LoyaltyProgramType
    let config: LoyaltyProgramConfig?
    var rewardDescription: String?
    var isActive: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case businessId = "business_id"
        case type
        case config
        case rewardDescription = "reward_description"
        case isActive = "is_active"
    }
}

struct LoyaltyProgramConfig: Codable {
    // Stamp program
    var stampsRequired: Int?
    var reward: String?

    // Points program
    var pointsPerVisit: Int?
    var rewards: [PointsReward]?

    enum CodingKeys: String, CodingKey {
        case stampsRequired = "stamps_required"
        case reward
        case pointsPerVisit = "points_per_visit"
        case rewards
    }
}

struct PointsReward: Codable {
    var pointsNeeded: Int
    var reward: String

    enum CodingKeys: String, CodingKey {
        case pointsNeeded = "points_needed"
        case reward
    }
}
