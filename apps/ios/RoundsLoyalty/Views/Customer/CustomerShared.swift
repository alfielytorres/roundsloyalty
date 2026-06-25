import SwiftUI

enum CustomerTab: Equatable {
    case home, discover, scan, rewards, profile
}

final class TabSelection: ObservableObject {
    @Published var tab: CustomerTab = .home
}

// MARK: - Stamp grid

/// A grid of stamp slots that fill up as the customer earns rounds. The icon is
/// a vendor-chosen emoji. Filled slots show the full-colour emoji; empty slots
/// are a flat silhouette ("mask") of the emoji in `emptyColor`.
struct StampGrid: View {
    let icon: String
    let filled: Int
    let total: Int
    var emptyColor: Color = Color.white.opacity(0.9)
    var maxDisplay: Int = 20
    var slotSize: CGFloat = 34

    private var count: Int { max(1, min(total, maxDisplay)) }

    // Most balanced grid width (columns >= rows): 8 -> 4, 9 -> 3, 10 -> 5.
    // Mirrors gridColumns() in the web CardPreview so both platforms match.
    private func balancedColumns(_ n: Int) -> Int {
        if n <= 1 { return 1 }
        var cols = n
        var bestDiff = Int.max
        var r = 1
        while r * r <= n {
            if n % r == 0 {
                let c = n / r
                if c - r < bestDiff { bestDiff = c - r; cols = c }
            }
            r += 1
        }
        if cols == n && n >= 7 {
            let rows = Int(Double(n).squareRoot())
            cols = Int(ceil(Double(n) / Double(rows)))
        }
        return cols
    }

    private var gridColumns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: 8), count: balancedColumns(count))
    }

    var body: some View {
        LazyVGrid(columns: gridColumns, spacing: 10) {
            ForEach(0..<count, id: \.self) { i in
                StampSlot(icon: icon.isEmpty ? "☕" : icon, filled: i < filled, size: slotSize, emptyColor: emptyColor, index: i)
            }
        }
    }
}

private struct StampSlot: View {
    let icon: String
    let filled: Bool
    let size: CGFloat
    let emptyColor: Color
    var index: Int = 0
    @State private var popped = false

    var body: some View {
        ZStack {
            Text(icon).font(.system(size: size)).opacity(0)   // reserve consistent size
            if filled {
                // Die-cut "sticker": stacked white outlines + a soft drop shadow,
                // with a staggered pop as it lands.
                Text(icon).font(.system(size: size))
                    .shadow(color: .white, radius: 1)
                    .shadow(color: .white, radius: 1)
                    .shadow(color: .white, radius: 0.5)
                    .shadow(color: .black.opacity(0.25), radius: 2, x: 0, y: 1)
                    .scaleEffect(popped ? 1 : 0.5)
                    .opacity(popped ? 1 : 0)
            } else {
                // Faint sticker-ring placeholder.
                emptyColor.opacity(0.55)
                    .mask { Text(icon).font(.system(size: size)) }
                    .shadow(color: .white.opacity(0.6), radius: 0.6)
            }
        }
        .frame(maxWidth: .infinity)
        .onAppear {
            guard filled, !popped else { return }
            withAnimation(.spring(response: 0.42, dampingFraction: 0.6).delay(Double(index) * 0.05)) {
                popped = true
            }
        }
    }
}

// MARK: - Loyalty card

/// The designed loyalty card shown to customers — used on the home screen and
/// in the vendor-detail sheet. The whole card takes the vendor's brand colour;
/// the stamp panel can use a separate colour or a background image. Mirrored by
/// the vendor portal's BrandingEditor preview.
struct LoyaltyCardView: View {
    let businessName: String
    let logoUrl: String?
    let brandColorHex: String?
    let stampBgColorHex: String?
    let backgroundUrl: String?
    let icon: String
    let current: Int
    let required: Int
    let rewardName: String?
    var memberName: String? = nil
    var rewardsCount: Int = 0

    private var cardColor: Color { Color.vendorAccent(brandColorHex) }
    private var cardIsLight: Bool { Color.luminanceHex(brandColorHex) > 0.4 }
    private var onCard: Color { Color.onColor(brandColorHex) }
    private var hasPanelColor: Bool { (stampBgColorHex?.isEmpty == false) }
    private var bgURL: URL? {
        guard let s = backgroundUrl, !s.isEmpty else { return nil }
        return URL(string: s)
    }
    private var emptyStampColor: Color {
        if bgURL != nil { return Color.white.opacity(0.92) }
        // Dark silhouette on light panels (incl. white), white silhouette on dark.
        let panelHex = hasPanelColor ? stampBgColorHex : brandColorHex
        return Color.luminanceHex(panelHex) > 0.179 ? Color.black.opacity(0.8) : Color.white.opacity(0.92)
    }
    private var remaining: Int { max(0, required - current) }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header — logo top-left + name
            HStack(spacing: 8) {
                if let logoUrl, let url = URL(string: logoUrl) {
                    // White chip + aspect-fit so non-square logos fit without distortion.
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.white)
                        .frame(width: 32, height: 32)
                        .overlay(
                            AsyncImage(url: url) { img in img.resizable().scaledToFit() }
                                placeholder: { Color.clear }
                                .padding(3)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                Text(businessName)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(onCard)
                    .lineLimit(1)
                Spacer()
                if remaining == 0 && required > 0 {
                    Text("READY")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(cardColor)
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(Capsule().fill(onCard))
                }
            }

            // Stamp panel
            ZStack {
                RoundedRectangle(cornerRadius: 18)
                    .fill(hasPanelColor ? Color(hex: stampBgColorHex!) : cardColor)
                if !hasPanelColor && bgURL == nil {
                    RoundedRectangle(cornerRadius: 18)
                        .fill(cardIsLight ? Color.black.opacity(0.16) : Color.white.opacity(0.16))
                }
                if let bgURL {
                    AsyncImage(url: bgURL) { img in img.resizable().scaledToFill() }
                        placeholder: { Color.clear }
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                    RoundedRectangle(cornerRadius: 18).fill(Color.black.opacity(0.18))
                }
                StampGrid(icon: icon, filled: current, total: required,
                          emptyColor: emptyStampColor, maxDisplay: 20, slotSize: 34)
                    .padding(16)
            }

            // Footer
            if let memberName {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("MEMBER").font(.system(size: 10, weight: .bold)).foregroundColor(onCard.opacity(0.6))
                        Text(memberName).font(.system(size: 15, weight: .semibold)).foregroundColor(onCard).lineLimit(1)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("REWARDS").font(.system(size: 10, weight: .bold)).foregroundColor(onCard.opacity(0.6))
                        HStack(spacing: 4) {
                            Text("\(rewardsCount)").font(.system(size: 15, weight: .semibold)).foregroundColor(onCard)
                            Text("×").font(.system(size: 12)).foregroundColor(onCard.opacity(0.6))
                            Text(icon.isEmpty ? "☕" : icon).font(.system(size: 15))
                        }
                    }
                }
            } else {
                HStack {
                    Text("\(current) / \(required)").font(.system(size: 14, weight: .bold)).foregroundColor(onCard)
                    Spacer()
                    if let rewardName {
                        Text(remaining > 0 ? "\(remaining) more for \(rewardName)" : "Ready: \(rewardName)")
                            .font(.system(size: 11))
                            .foregroundColor(onCard.opacity(0.75))
                            .lineLimit(1)
                    }
                }
            }
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 24)
                .fill(cardColor)
                .shadow(color: .black.opacity(0.12), radius: 14, x: 0, y: 6)
        )
    }
}
