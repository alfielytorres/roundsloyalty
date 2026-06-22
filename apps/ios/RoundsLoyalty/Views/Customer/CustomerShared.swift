import SwiftUI

enum CustomerTab: Equatable {
    case home, discover, scan, rewards, profile
}

final class TabSelection: ObservableObject {
    @Published var tab: CustomerTab = .home
}

// MARK: - Stamp grid

/// A grid of stamp "slots" that fill up as the customer earns rounds. The icon
/// is a vendor-chosen emoji; filled slots are bright, empty slots are faint.
/// Mirrors the vendor's web preview in BrandingEditor.
struct StampGrid: View {
    let icon: String
    let filled: Int
    let total: Int
    var maxDisplay: Int = 10
    var columns: Int = 5
    var slotSize: CGFloat = 32

    private var count: Int { max(1, min(total, maxDisplay)) }
    private var gridColumns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: 8), count: min(columns, count))
    }

    var body: some View {
        LazyVGrid(columns: gridColumns, spacing: 8) {
            ForEach(0..<count, id: \.self) { i in
                StampSlot(icon: icon, filled: i < filled, size: slotSize)
            }
        }
    }
}

private struct StampSlot: View {
    let icon: String
    let filled: Bool
    let size: CGFloat

    var body: some View {
        ZStack {
            Circle().fill(Color.white.opacity(filled ? 0.95 : 0.22))
            Text(icon.isEmpty ? "☕" : icon)
                .font(.system(size: size * 0.52))
                .grayscale(filled ? 0 : 1)
                .opacity(filled ? 1 : 0.5)
        }
        .frame(width: size, height: size)
        .frame(maxWidth: .infinity)
    }
}
