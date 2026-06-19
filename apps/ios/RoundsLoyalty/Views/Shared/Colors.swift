import SwiftUI

// MARK: - Palette

extension Color {
    static let appBackground = Color(hex: "#F0EDE8")
    static let glassCard = Color.white.opacity(0.60)
    static let glassBorder = Color.white.opacity(0.80)
    static let primaryText = Color(hex: "#111111")
    static let secondaryText = Color.black.opacity(0.40)
    static let accentDefault = Color(hex: "#E8805A")

    // Legacy compatibility
    static let brandGreen = Color(red: 0x16 / 255, green: 0xA3 / 255, blue: 0x4A / 255)
    static let brandLightGreen = Color(red: 0xD1 / 255, green: 0xFA / 255, blue: 0xE5 / 255)
    static let brandDarkGreen = Color(red: 0x15 / 255, green: 0x80 / 255, blue: 0x3D / 255)
    static let brandCream = Color(hex: "#F0EDE8")
    static let brandCard = Color.white
    static let brandBorder = Color(red: 0xE8 / 255, green: 0xE2 / 255, blue: 0xD9 / 255)
    static let brandAccent = Color(hex: "#F0EDE8")
    static let brandText = Color(hex: "#111111")
    static let brandTaupe = Color(red: 0x6B / 255, green: 0x72 / 255, blue: 0x80 / 255)
    static let brandSubtle = Color(red: 0x9C / 255, green: 0xA3 / 255, blue: 0xAF / 255)

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

    static func vendorAccent(_ hex: String?) -> Color {
        guard let hex = hex, !hex.isEmpty else { return .accentDefault }
        return Color(hex: hex)
    }
}

// MARK: - Card radial gradient presets (iOS widget style)

struct CardRadialGradient: View {
    let index: Int

    private var colors: (light: Color, dark: Color) {
        switch index % 5 {
        case 0: return (Color(hex: "#FB7185"), Color(hex: "#BE123C"))   // rose/pink
        case 1: return (Color(hex: "#A78BFA"), Color(hex: "#6D28D9"))   // violet/purple
        case 2: return (Color(hex: "#7DD3FC"), Color(hex: "#0284C7"))   // sky/blue
        case 3: return (Color(hex: "#CBD5E1"), Color(hex: "#475569"))   // slate
        default: return (Color(hex: "#FCA5A5"), Color(hex: "#DC2626"))  // red/salmon
        }
    }

    var body: some View {
        RadialGradient(
            colors: [colors.light.opacity(0.95), colors.dark.opacity(0.88)],
            center: .init(x: 0.3, y: 0.75),
            startRadius: 0,
            endRadius: 180
        )
    }
}

// Legacy LinearGradient shim so HomeView still compiles
extension LinearGradient {
    static func cardGradient(index: Int) -> LinearGradient {
        let presets: [(Color, Color)] = [
            (Color(hex: "#FB7185"), Color(hex: "#BE123C")),
            (Color(hex: "#A78BFA"), Color(hex: "#6D28D9")),
            (Color(hex: "#7DD3FC"), Color(hex: "#0284C7")),
            (Color(hex: "#CBD5E1"), Color(hex: "#475569")),
            (Color(hex: "#FCA5A5"), Color(hex: "#DC2626")),
        ]
        let (light, dark) = presets[index % presets.count]
        return LinearGradient(colors: [light, dark], startPoint: .init(x: 0.3, y: 0.75), endPoint: .topTrailing)
    }
}

// MARK: - Glass card modifier

struct GlassCardStyle: ViewModifier {
    var cornerRadius: CGFloat = 20

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(Color.white.opacity(0.60))
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .stroke(Color.white.opacity(0.80), lineWidth: 1)
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
                    .fill(Color.white.opacity(0.60))
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .stroke(Color.white.opacity(0.80), lineWidth: 1)
                    )
                    .shadow(color: Color.black.opacity(0.06), radius: 8, x: 0, y: 2)
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
