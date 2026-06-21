import Foundation

struct Membership: Codable, Identifiable {
    let id: UUID
    let customerId: UUID
    let vendorId: UUID
    let currentRounds: Int
    let lifetimeRounds: Int
    let status: String
    let activatedAt: Date?
    var vendors: [Vendor]?
    var loyaltyPrograms: [LoyaltyProgram]?

    var vendor: Vendor? { vendors?.first }
    var program: LoyaltyProgram? { loyaltyPrograms?.first }

    enum CodingKeys: String, CodingKey {
        case id
        case customerId = "customer_id"
        case vendorId = "vendor_id"
        case currentRounds = "current_rounds"
        case lifetimeRounds = "lifetime_rounds"
        case status
        case activatedAt = "activated_at"
        case vendors
        case loyaltyPrograms = "loyalty_programs"
    }
}
