import Foundation

struct Vendor: Codable, Identifiable {
    let id: UUID
    let businessName: String
    let description: String?
    let category: String?
    let logoUrl: String?
    let brandColor: String?
    let address: String?
    let lat: Double?
    let lng: Double?
    let joinToken: String?
    let status: String?

    enum CodingKeys: String, CodingKey {
        case id
        case businessName = "business_name"
        case description
        case category
        case logoUrl = "logo_url"
        case brandColor = "brand_color"
        case address
        case lat
        case lng
        case joinToken = "join_token"
        case status
    }
}
