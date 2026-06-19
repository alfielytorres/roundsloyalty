import SwiftUI

// MARK: - Inter font helpers
// To activate: add Inter font .ttf files to a Fonts/ group in Xcode
// and register them under "Fonts provided by application" in Info.plist.
// Download from: https://rsms.me/inter/
// Files needed: Inter-Regular.ttf, Inter-Medium.ttf, Inter-SemiBold.ttf, Inter-Bold.ttf, Inter-Black.ttf

extension Font {
    static func inter(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let name: String
        switch weight {
        case .black:           name = "Inter-Black"
        case .bold, .heavy:    name = "Inter-Bold"
        case .semibold:        name = "Inter-SemiBold"
        case .medium:          name = "Inter-Medium"
        default:               name = "Inter-Regular"
        }
        // Falls back to system font if Inter isn't installed yet
        let custom = UIFont(name: name, size: size)
        return custom != nil
            ? .custom(name, size: size)
            : .system(size: size, weight: weight, design: .default)
    }
}

// MARK: - Global tight-tracking modifier

struct TightTracking: ViewModifier {
    func body(content: Content) -> some View {
        content
            .tracking(-0.4)
    }
}

extension View {
    /// Apply Inter + tight tracking to any Text hierarchy.
    func appTypography() -> some View {
        modifier(TightTracking())
    }
}
