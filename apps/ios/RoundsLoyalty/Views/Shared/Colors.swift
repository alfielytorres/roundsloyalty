import SwiftUI

extension Color {
    /// Primary green matching web portal #16A34A
    static let brandGreen = Color(red: 0x16 / 255, green: 0xA3 / 255, blue: 0x4A / 255)
    /// Light green #D1FAE5
    static let brandLightGreen = Color(red: 0xD1 / 255, green: 0xFA / 255, blue: 0xE5 / 255)
    /// Dark green #15803D
    static let brandDarkGreen = Color(red: 0x15 / 255, green: 0x80 / 255, blue: 0x3D / 255)
    /// Background cream matching web #F8F5F1
    static let brandCream = Color(red: 0xF8 / 255, green: 0xF5 / 255, blue: 0xF1 / 255)
    /// Card background #FFFFFF
    static let brandCard = Color.white
    /// Border #E8E2D9
    static let brandBorder = Color(red: 0xE8 / 255, green: 0xE2 / 255, blue: 0xD9 / 255)
    /// Muted accent #F0EDE6
    static let brandAccent = Color(red: 0xF0 / 255, green: 0xED / 255, blue: 0xE6 / 255)
    /// Primary text #111111
    static let brandText = Color(red: 0x11 / 255, green: 0x11 / 255, blue: 0x11 / 255)
    /// Secondary text #6B7280
    static let brandTaupe = Color(red: 0x6B / 255, green: 0x72 / 255, blue: 0x80 / 255)
    /// Subtle text #9CA3AF
    static let brandSubtle = Color(red: 0x9C / 255, green: 0xA3 / 255, blue: 0xAF / 255)
}

struct CardStyle: ViewModifier {
    var cornerRadius: CGFloat = 20
    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(Color.brandCard)
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .stroke(Color.brandBorder, lineWidth: 1)
                    )
                    .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 2)
            )
    }
}

extension View {
    func glassCard(cornerRadius: CGFloat = 20) -> some View {
        modifier(CardStyle(cornerRadius: cornerRadius))
    }
}
