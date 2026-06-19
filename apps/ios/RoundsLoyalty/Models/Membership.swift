import Foundation

struct Membership: Codable, Identifiable {
    let id: UUID
    let customerId: UUID
    let vendorId: UUID
    let currentRounds: Int
    let lifetimeRounds: Int
    let status: String
    let activatedAt: Date?
    var vendor: Vendor?
    var program: LoyaltyProgram?

    enum CodingKeys: String, CodingKey {
        case id
        case customerId = "customer_id"
        case vendorId = "vendor_id"
        case currentRounds = "current_rounds"
        case lifetimeRounds = "lifetime_rounds"
        case status
        case activatedAt = "activated_at"
        case vendor = "vendors"
        case program = "loyalty_programs"
    }
}
