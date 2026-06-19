import Foundation

enum UserRole: String, Codable {
    case customer
    case vendor
}

struct Profile: Codable, Identifiable {
    let id: UUID
    let displayName: String?
    let email: String?
    let role: UserRole
    let customerToken: String?

    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case email
        case role
        case customerToken = "customer_token"
    }
}
