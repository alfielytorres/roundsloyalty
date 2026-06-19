import SwiftUI

// MARK: - Monochrome palette

extension Color {
    static let appBackground  = Color(hex: "#F5F5F7")
    static let glassCard      = Color.white.opacity(0.72)
    static let glassBorder    = Color.white.opacity(0.90)
    static let primaryText    = Color(hex: "#1D1D1F")
    static let secondaryText  = Color.black.opacity(0.40)
    static let accentDefault  = Color(hex: "#1D1D1F")

    // Legacy compatibility
    static let brandGreen       = Color.black
    static let brandLightGreen  = Color.white
    static let brandDarkGreen   = Color.black
    static let brandCream       = Color(hex: "#F5F5F7")
    static let brandCard        = Color.white
    static let brandBorder      = Color(hex: "#E5E5EA")
    static let brandAccent      = Color(hex: "#F5F5F7")
    static let brandText        = Color(hex: "#1D1D1F")
    static let brandTaupe       = Color.black.opacity(0.40)
    static let brandSubtle      = Color.black.opacity(0.28)

    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b, a: UInt64
        switch hex.count {
        case 6: (r, g, b, a) = (int >> 16, int >> 8 & 0xFF, int & 0xFF, 255)
        case 8: (r, g, b, a) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default: (r, g, b, a) = (0, 0, 0, 255)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }

    static func vendorAccent(_ hex: String?) -> Color { .primaryText }
}

// MARK: - Monochrome card gradient (shades of white/grey)

struct CardRadialGradient: View {
    let index: Int

    private var shade: Double {
        // Alternate between slightly lighter and slightly darker glass
        index % 2 == 0 ? 0.80 : 0.65
    }

    var body: some View {
        Color.white.opacity(shade)
    }
}

// Legacy shim
extension LinearGradient {
    static func cardGradient(index: Int) -> LinearGradient {
        let opacity: Double = index % 2 == 0 ? 0.80 : 0.65
        return LinearGradient(colors: [Color.white.opacity(opacity)], startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

// MARK: - Glass card modifiers

struct GlassCardStyle: ViewModifier {
    var cornerRadius: CGFloat = 20
    func body(content: Content) -> some View {
        content.background(
            RoundedRectangle(cornerRadius: cornerRadius)
                .fill(Color.white.opacity(0.72))
                .overlay(RoundedRectangle(cornerRadius: cornerRadius).stroke(Color.white.opacity(0.90), lineWidth: 1))
        )
    }
}

struct CardStyle: ViewModifier {
    var cornerRadius: CGFloat = 20
    func body(content: Content) -> some View {
        content.background(
            RoundedRectangle(cornerRadius: cornerRadius)
                .fill(Color.white.opacity(0.72))
                .overlay(RoundedRectangle(cornerRadius: cornerRadius).stroke(Color.white.opacity(0.90), lineWidth: 1))
                .shadow(color: Color.black.opacity(0.06), radius: 8, x: 0, y: 2)
        )
    }
}

extension View {
    func glassCard(cornerRadius: CGFloat = 20) -> some View { modifier(CardStyle(cornerRadius: cornerRadius)) }
    func darkGlassCard(cornerRadius: CGFloat = 20) -> some View { modifier(GlassCardStyle(cornerRadius: cornerRadius)) }
}
