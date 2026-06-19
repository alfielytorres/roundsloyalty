import Foundation

struct AwardResult: Codable {
    let roundsAwarded: Int
    let campaignId: UUID?
    let campaignName: String?
    let balance: BalanceInfo
    let rewardsUnlocked: Int
    let membershipId: UUID

    struct BalanceInfo: Codable {
        let currentRounds: Int
        let lifetimeRounds: Int

        enum CodingKeys: String, CodingKey {
            case currentRounds = "current_rounds"
            case lifetimeRounds = "lifetime_rounds"
        }
    }

    enum CodingKeys: String, CodingKey {
        case roundsAwarded = "rounds_awarded"
        case campaignId = "campaign_id"
        case campaignName = "campaign_name"
        case balance
        case rewardsUnlocked = "rewards_unlocked"
        case membershipId = "membership_id"
    }
}
