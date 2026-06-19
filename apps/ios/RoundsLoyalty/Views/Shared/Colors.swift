import SwiftUI

// MARK: - Dark glass palette

extension Color {
    // New dark theme colours
    static let appBackground = Color(hex: "#0D0D0D")
    static let glassCard = Color.white.opacity(0.10)
    static let glassBorder = Color.white.opacity(0.15)
    static let primaryText = Color.white
    static let secondaryText = Color.white.opacity(0.55)
    static let accentDefault = Color(hex: "#E8805A") // coral fallback

    // Legacy brand colours kept for compatibility
    static let brandGreen = Color(red: 0x16 / 255, green: 0xA3 / 255, blue: 0x4A / 255)
    static let brandLightGreen = Color(red: 0xD1 / 255, green: 0xFA / 255, blue: 0xE5 / 255)
    static let brandDarkGreen = Color(red: 0x15 / 255, green: 0x80 / 255, blue: 0x3D / 255)
    static let brandCream = Color(red: 0xF8 / 255, green: 0xF5 / 255, blue: 0xF1 / 255)
    static let brandCard = Color.white
    static let brandBorder = Color(red: 0xE8 / 255, green: 0xE2 / 255, blue: 0xD9 / 255)
    static let brandAccent = Color(red: 0xF0 / 255, green: 0xED / 255, blue: 0xE6 / 255)
    static let brandText = Color(red: 0x11 / 255, green: 0x11 / 255, blue: 0x11 / 255)
    static let brandTaupe = Color(red: 0x6B / 255, green: 0x72 / 255, blue: 0x80 / 255)
    static let brandSubtle = Color(red: 0x9C / 255, green: 0xA3 / 255, blue: 0xAF / 255)

    // Hex initialiser
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
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }

    /// Parse a hex brand colour string, falling back to coral accent
    static func vendorAccent(_ hex: String?) -> Color {
        guard let hex = hex, !hex.isEmpty else { return .accentDefault }
        return Color(hex: hex)
    }
}

// MARK: - Glass card modifier

struct GlassCardStyle: ViewModifier {
    var cornerRadius: CGFloat = 20

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(Color.glassCard)
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .stroke(Color.glassBorder, lineWidth: 1)
                    )
            )
    }
}

struct CardStyle: ViewModifier {
    var cornerRadius: CGFloat = 20
    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(Color.glassCard)
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .stroke(Color.glassBorder, lineWidth: 1)
                    )
                    .shadow(color: Color.black.opacity(0.3), radius: 8, x: 0, y: 2)
            )
    }
}

extension View {
    func glassCard(cornerRadius: CGFloat = 20) -> some View {
        modifier(CardStyle(cornerRadius: cornerRadius))
    }

    func darkGlassCard(cornerRadius: CGFloat = 20) -> some View {
        modifier(GlassCardStyle(cornerRadius: cornerRadius))
    }
}

// MARK: - Card gradient presets

extension LinearGradient {
    /// Cycles through a palette of rich gradient card colours.
    /// Index 0 = rose/red, 1 = teal/dark, 2 = coral/orange, 3 = blue/navy, 4 = purple
    static func cardGradient(index: Int) -> LinearGradient {
        let presets: [[Color]] = [
            [Color(hex: "#C96B6B"), Color(hex: "#7A2A2A")],  // rose/dark red
            [Color(hex: "#2A5A6B"), Color(hex: "#0A1A2A")],  // teal/dark
            [Color(hex: "#E8805A"), Color(hex: "#8B3A1A")],  // coral/orange
            [Color(hex: "#4A6FA5"), Color(hex: "#1A2A50")],  // blue/navy
            [Color(hex: "#6B5EA8"), Color(hex: "#2A1A50")],  // purple
        ]
        let colors = presets[index % presets.count]
        return LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}
