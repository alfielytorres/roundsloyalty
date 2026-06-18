import Foundation

struct Vendor: Codable, Identifiable {
    let id: UUID
    let businessName: String
    let logoUrl: String?
    let category: String?
    let description: String?
    let proofOfPurchaseEnabled: Bool
    let status: String
    var storeLocations: [StoreLocation]?

    enum CodingKeys: String, CodingKey {
        case id
        case businessName = "business_name"
        case logoUrl = "logo_url"
        case category
        case description
        case proofOfPurchaseEnabled = "proof_of_purchase_enabled"
        case status
        case storeLocations = "store_locations"
    }
}

struct StoreLocation: Codable, Identifiable {
    let id: UUID
    let vendorId: UUID
    let name: String
    let address: String?
    let suburb: String?
    let state: String?
    let country: String?

    enum CodingKeys: String, CodingKey {
        case id
        case vendorId = "vendor_id"
        case name
        case address
        case suburb
        case state
        case country
    }
}
