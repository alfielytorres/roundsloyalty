import Foundation

enum ClaimStatus: String, Codable {
    case pendingReview = "pending_review"
    case approved
    case rejected
    case needsMoreInfo = "needs_more_info"
    case expired
}

struct PurchaseClaim: Codable, Identifiable {
    let id: UUID
    let customerId: UUID
    let vendorId: UUID
    let receiptImageUrl: String?
    let purchaseAmount: Double?
    let purchaseDate: String?
    let customerNote: String?
    let vendorNote: String?
    let status: ClaimStatus
    let createdAt: Date?
    var vendor: Vendor?

    enum CodingKeys: String, CodingKey {
        case id
        case customerId = "customer_id"
        case vendorId = "vendor_id"
        case receiptImageUrl = "receipt_image_url"
        case purchaseAmount = "purchase_amount"
        case purchaseDate = "purchase_date"
        case customerNote = "customer_note"
        case vendorNote = "vendor_note"
        case status
        case createdAt = "created_at"
        case vendor = "vendors"
    }
}
