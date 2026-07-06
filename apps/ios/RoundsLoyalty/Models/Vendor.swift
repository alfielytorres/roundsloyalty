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
    let stampIcon: String?
    let cardBackgroundUrl: String?
    let stampBgColor: String?
    var cardFrontUrl: String? = nil
    var cardFrontHeadline: String? = nil
    var cardFrontSubtext: String? = nil
    var cardBackMessage: String? = nil

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
        case stampIcon = "stamp_icon"
        case cardBackgroundUrl = "card_background_url"
        case stampBgColor = "stamp_bg_color"
        case cardFrontUrl = "card_front_url"
        case cardFrontHeadline = "card_front_headline"
        case cardFrontSubtext = "card_front_subtext"
        case cardBackMessage = "card_back_message"
    }
}
