import Foundation

struct CustomerNotification: Codable, Identifiable {
    let id: UUID
    let customerId: UUID
    let vendorId: UUID?
    let title: String
    let body: String
    let status: String
    let errorMessage: String?
    let readAt: Date?
    let sentAt: Date?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case customerId   = "customer_id"
        case vendorId     = "vendor_id"
        case title, body, status
        case errorMessage = "error_message"
        case readAt       = "read_at"
        case sentAt       = "sent_at"
        case createdAt    = "created_at"
    }

    var isRead: Bool { readAt != nil }

    var statusColor: String {
        switch status {
        case "delivered": return "green"
        case "sent":      return "blue"
        case "failed":    return "red"
        default:          return "gray"
        }
    }

    var statusLabel: String {
        switch status {
        case "delivered": return "Delivered"
        case "sent":      return "Sent"
        case "failed":    return "Failed"
        default:          return "Pending"
        }
    }
}
