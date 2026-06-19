import Foundation

struct LoyaltyProgram: Codable, Identifiable {
    let id: UUID
    let vendorId: UUID
    let name: String
    let roundsRequired: Int
    let rewardName: String
    let rewardDescription: String?
    let defaultRoundValue: Int
    let status: String

    enum CodingKeys: String, CodingKey {
        case id
        case vendorId = "vendor_id"
        case name
        case roundsRequired = "rounds_required"
        case rewardName = "reward_name"
        case rewardDescription = "reward_description"
        case defaultRoundValue = "default_round_value"
        case status
    }
}
