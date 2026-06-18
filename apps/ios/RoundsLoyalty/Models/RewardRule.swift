import Foundation

struct RewardRule: Codable, Identifiable {
    let id: UUID
    let loyaltyProgramId: UUID
    let vendorId: UUID
    let type: String
    let requiredStamps: Int?
    let pointsMultiplier: Double?
    let pointsRequired: Int?
    let rewardName: String?
    let rewardDescription: String?

    enum CodingKeys: String, CodingKey {
        case id
        case loyaltyProgramId = "loyalty_program_id"
        case vendorId = "vendor_id"
        case type
        case requiredStamps = "required_stamps"
        case pointsMultiplier = "points_multiplier"
        case pointsRequired = "points_required"
        case rewardName = "reward_name"
        case rewardDescription = "reward_description"
    }
}
