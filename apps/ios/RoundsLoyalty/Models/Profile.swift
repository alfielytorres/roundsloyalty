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
    let birthday: String?   // ISO "yyyy-MM-dd"

    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case email
        case role
        case customerToken = "customer_token"
        case birthday
    }
}

/// Birthdays are stored as ISO "yyyy-MM-dd" strings. These helpers convert to/from
/// the Date used by SwiftUI's DatePicker without timezone drift.
enum BirthdayFormat {
    static func string(from date: Date) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 2000, c.month ?? 1, c.day ?? 1)
    }

    static func date(from string: String?) -> Date? {
        guard let s = string else { return nil }
        let parts = s.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        var dc = DateComponents()
        dc.year = parts[0]; dc.month = parts[1]; dc.day = parts[2]
        return Calendar.current.date(from: dc)
    }

    /// Sensible default for a fresh picker (~25 years old).
    static var defaultDate: Date {
        Calendar.current.date(byAdding: .year, value: -25, to: Date()) ?? Date()
    }

    /// Allowed range: 1900 through today.
    static var range: ClosedRange<Date> {
        let min = Calendar.current.date(from: DateComponents(year: 1900, month: 1, day: 1)) ?? Date(timeIntervalSince1970: 0)
        return min...Date()
    }
}
