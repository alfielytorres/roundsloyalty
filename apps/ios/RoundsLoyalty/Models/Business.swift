import Foundation

struct Business: Codable, Identifiable {
    let id: UUID
    let ownerId: UUID?
    var name: String
    var description: String?
    var logoUrl: String?
    var address: String?
    var lat: Double?
    var lng: Double?
    var qrCodeSecret: String?

    enum CodingKeys: String, CodingKey {
        case id
        case ownerId = "owner_id"
        case name
        case description
        case logoUrl = "logo_url"
        case address
        case lat
        case lng
        case qrCodeSecret = "qr_code_secret"
    }
}
