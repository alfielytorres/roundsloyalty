import Foundation

struct LoyaltyCard: Codable, Identifiable {
    let id: UUID
    let customerId: UUID
    var stampsCollected: Int
    var pointsAccumulated: Int
    var lastVisit: Date?
    var loyaltyProgram: LoyaltyProgramWithBusiness?

    enum CodingKeys: String, CodingKey {
        case id
        case customerId = "customer_id"
        case stampsCollected = "stamps_collected"
        case pointsAccumulated = "points_accumulated"
        case lastVisit = "last_visit"
        case loyaltyProgram = "loyalty_programs"
    }
}

struct LoyaltyProgramWithBusiness: Codable, Identifiable {
    let id: UUID
    let businessId: UUID
    let type: LoyaltyProgramType
    let config: LoyaltyProgramConfig?
    var rewardDescription: String?
    var isActive: Bool
    var business: Business?

    enum CodingKeys: String, CodingKey {
        case id
        case businessId = "business_id"
        case type
        case config
        case rewardDescription = "reward_description"
        case isActive = "is_active"
        case business = "businesses"
    }
}

struct ScanResult: Codable {
    let card: LoyaltyCardScanInfo
    let stampsAdded: Int
    let rewardUnlocked: Bool
    let business: Business

    enum CodingKeys: String, CodingKey {
        case card
        case stampsAdded = "stamps_added"
        case rewardUnlocked = "reward_unlocked"
        case business
    }
}

struct LoyaltyCardScanInfo: Codable {
    let id: UUID
    let stampsCollected: Int

    enum CodingKeys: String, CodingKey {
        case id
        case stampsCollected = "stamps_collected"
    }
}

struct DataConsent: Codable, Identifiable {
    let id: UUID
    let customerId: UUID
    let businessId: UUID
    var withdrawnAt: Date?
    var business: BusinessSummary?

    enum CodingKeys: String, CodingKey {
        case id
        case customerId = "customer_id"
        case businessId = "business_id"
        case withdrawnAt = "withdrawn_at"
        case business = "businesses"
    }
}

struct BusinessSummary: Codable, Identifiable {
    let id: UUID
    let name: String
}

struct Offer: Codable, Identifiable {
    let id: UUID
    let businessId: UUID
    let title: String
    let body: String
    let targetSegment: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case businessId = "business_id"
        case title
        case body
        case targetSegment = "target_segment"
        case createdAt = "created_at"
    }
}

struct OfferRecipient: Codable, Identifiable {
    let id: UUID
    let offerId: UUID
    var deliveredAt: Date?
    var openedAt: Date?
    var offer: OfferWithBusiness?

    enum CodingKeys: String, CodingKey {
        case id
        case offerId = "offer_id"
        case deliveredAt = "delivered_at"
        case openedAt = "opened_at"
        case offer = "offers"
    }
}

struct OfferWithBusiness: Codable, Identifiable {
    let id: UUID
    let title: String
    let body: String
    let createdAt: Date
    var business: OfferBusiness?

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case body
        case createdAt = "created_at"
        case business = "businesses"
    }
}

struct OfferBusiness: Codable {
    let name: String
    let logoUrl: String?

    enum CodingKeys: String, CodingKey {
        case name
        case logoUrl = "logo_url"
    }
}

struct CustomerSegment: Codable, Identifiable {
    let customerId: UUID
    let businessId: UUID
    let displayName: String?
    let totalVisits: Int
    let lastVisit: Date?
    let segment: String

    var id: UUID { customerId }

    enum CodingKeys: String, CodingKey {
        case customerId = "customer_id"
        case businessId = "business_id"
        case displayName = "display_name"
        case totalVisits = "total_visits"
        case lastVisit = "last_visit"
        case segment
    }
}

struct RecentActivity: Codable, Identifiable {
    let id: UUID
    let createdAt: Date
    let stampsAdded: Int
    let customerName: String?

    enum CodingKeys: String, CodingKey {
        case id
        case createdAt = "created_at"
        case stampsAdded = "stamps_added"
        case customerName = "customer_name"
    }
}
