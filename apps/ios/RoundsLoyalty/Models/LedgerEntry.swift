import Foundation

struct LedgerEntry: Codable, Identifiable {
    let id: UUID
    let customerId: UUID
    let vendorId: UUID
    let eventType: String
    let pointsDelta: Int?
    let stampsDelta: Int?
    let source: String?
    let createdAt: Date?
    var vendor: Vendor?

    enum CodingKeys: String, CodingKey {
        case id
        case customerId = "customer_id"
        case vendorId = "vendor_id"
        case eventType = "event_type"
        case pointsDelta = "points_delta"
        case stampsDelta = "stamps_delta"
        case source
        case createdAt = "created_at"
        case vendor = "vendors"
    }

    var friendlyDescription: String {
        let storeName = vendor?.businessName ?? "store"
        switch eventType {
        case "joined": return "Joined \(storeName)"
        case "activated": return "Activated at \(storeName)"
        case "stamp_added":
            let n = stampsDelta ?? 1
            return "+\(n) stamp at \(storeName)"
        case "points_added":
            let n = pointsDelta ?? 0
            return "+\(n) points at \(storeName)"
        case "reward_earned": return "Reward earned at \(storeName)!"
        case "reward_redeemed": return "Reward redeemed at \(storeName)"
        case "proof_purchase_submitted": return "Claim submitted to \(storeName)"
        case "proof_purchase_approved": return "Claim approved by \(storeName)"
        case "proof_purchase_rejected": return "Claim rejected by \(storeName)"
        default: return eventType.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    var eventIcon: String {
        switch eventType {
        case "joined": return "person.badge.plus"
        case "activated": return "checkmark.seal.fill"
        case "stamp_added": return "seal.fill"
        case "points_added": return "star.fill"
        case "reward_earned": return "gift.fill"
        case "reward_redeemed": return "gift"
        case "proof_purchase_submitted": return "doc.text"
        case "proof_purchase_approved": return "checkmark.circle.fill"
        case "proof_purchase_rejected": return "xmark.circle.fill"
        default: return "circle.fill"
        }
    }
}
