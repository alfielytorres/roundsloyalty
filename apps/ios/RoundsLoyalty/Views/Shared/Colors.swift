import SwiftUI

extension Color {
    /// Primary green: #7DB542
    static let brandGreen = Color(red: 0x7D / 255, green: 0xB5 / 255, blue: 0x42 / 255)
    /// Light green: #D4EDBE
    static let brandLightGreen = Color(red: 0xD4 / 255, green: 0xED / 255, blue: 0xBE / 255)
    /// Dark green: #0D1F0D
    static let brandDarkGreen = Color(red: 0x0D / 255, green: 0x1F / 255, blue: 0x0D / 255)
    /// Cream: #EDE9DF
    static let brandCream = Color(red: 0xED / 255, green: 0xE9 / 255, blue: 0xDF / 255)
    /// Taupe: #C4BAA8
    static let brandTaupe = Color(red: 0xC4 / 255, green: 0xBA / 255, blue: 0xA8 / 255)
}

// MARK: - Dark Theme Colors
extension Color {
    static let appBackground = Color(red: 0.04, green: 0.07, blue: 0.04)
    static let cardSurface = Color(red: 0.09, green: 0.14, blue: 0.09)
    static let primaryText = Color.white
    static let secondaryText = Color(red: 0.55, green: 0.65, blue: 0.55)
}

struct GlassCard: ViewModifier {
    var cornerRadius: CGFloat = 18
    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(Color.cardSurface)
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .stroke(Color.brandGreen.opacity(0.18), lineWidth: 0.5)
                    )
                    .shadow(color: Color.brandGreen.opacity(0.06), radius: 10, x: 0, y: 4)
            )
    }
}

extension View {
    func glassCard(cornerRadius: CGFloat = 18) -> some View {
        modifier(GlassCard(cornerRadius: cornerRadius))
    }
}
