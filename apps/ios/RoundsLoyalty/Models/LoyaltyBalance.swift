import Foundation

struct LoyaltyBalance: Codable, Identifiable {
    let id: UUID
    let customerId: UUID
    let vendorId: UUID
    let stamps: Int
    let points: Int

    enum CodingKeys: String, CodingKey {
        case id
        case customerId = "customer_id"
        case vendorId = "vendor_id"
        case stamps
        case points
    }
}
