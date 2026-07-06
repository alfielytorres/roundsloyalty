import SwiftUI

enum CustomerTab: Equatable {
    case home, discover, scan, rewards, profile
}

final class TabSelection: ObservableObject {
    @Published var tab: CustomerTab = .home
}

// MARK: - Stamp grid

/// A grid of rubber-stamp "seals" that fill as the customer earns rounds. Empty
/// slots are a dashed ring waiting to be stamped; filled slots are a solid ring
/// holding an inked silhouette of the vendor's icon, tilted slightly so the card
/// feels hand-stamped. `inkColor` is chosen for contrast against the panel and is
/// used for both the ring and the silhouette — like a single-colour stamp pad.
struct StampGrid: View {
    let icon: String
    let filled: Int
    let total: Int
    var inkColor: Color = Color.white.opacity(0.9)
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
                StampSlot(icon: icon.isEmpty ? "☕" : icon, filled: i < filled, size: slotSize, ink: inkColor, index: i)
            }
        }
    }
}

private struct StampSlot: View {
    let icon: String
    let filled: Bool
    let size: CGFloat
    let ink: Color
    var index: Int = 0
    @State private var popped = false

    private var jitter: Double { Double((index * 37) % 13 - 6) }

    var body: some View {
        ZStack {
            if filled {
                // A stamped seal: a solid ring around an inked silhouette of the icon.
                Circle().strokeBorder(ink.opacity(0.9), lineWidth: size * 0.09)
                ink.opacity(0.92)
                    .mask { Text(icon).font(.system(size: size * 0.52)) }
            } else {
                // An empty slot: a dashed ring waiting to be stamped.
                Circle().strokeBorder(ink.opacity(0.4),
                                      style: StrokeStyle(lineWidth: size * 0.05,
                                                         dash: [size * 0.16, size * 0.12]))
            }
        }
        .frame(width: size, height: size)
        .rotationEffect(.degrees(jitter))
        .scaleEffect(filled ? (popped ? 1 : 0.5) : 1)
        .opacity(filled ? (popped ? 1 : 0) : 1)
        .frame(maxWidth: .infinity)   // centre the seal in its grid cell
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
/// in the vendor-detail sheet. It has two faces, like a real card:
///   • front — the brand identity side (custom art or brand gradient, logo,
///     headline + subtext). Lazy vendors get a clean gradient with their name.
///   • back  — the functional stamp side (message, stamp grid, progress/member).
/// Tap the flip button (top-right) to reveal the back. Mirrored by the vendor
/// portal's CardPreview, which exports each face as a JPEG for socials.
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
    var frontUrl: String? = nil
    var frontHeadline: String? = nil
    var frontSubtext: String? = nil
    var backMessage: String? = nil
    var frontTextColor: String? = nil   // "dark" | "light" | nil (auto)
    var backTextColor: String? = nil

    @State private var showBack = false

    private var cardColor: Color { Color.vendorAccent(brandColorHex) }
    private var cardIsLight: Bool { Color.luminanceHex(brandColorHex) > 0.4 }
    private var onCard: Color { Color.onColor(brandColorHex) }

    // Resolve a per-side text-colour choice to an ink, falling back to `auto`.
    private func ink(_ choice: String?, auto: Color) -> Color {
        switch choice {
        case "dark": return Color(hex: "#1D1D1F")
        case "light": return .white
        default: return auto
        }
    }
    private var frontInk: Color { ink(frontTextColor, auto: frontURL != nil ? .white : onCard) }
    private var backInk: Color { ink(backTextColor, auto: onCard) }
    private var hasPanelColor: Bool { (stampBgColorHex?.isEmpty == false) }
    private var bgURL: URL? {
        guard let s = backgroundUrl, !s.isEmpty else { return nil }
        return URL(string: s)
    }
    private var frontURL: URL? {
        guard let s = frontUrl, !s.isEmpty else { return nil }
        return URL(string: s)
    }
    private var emptyStampColor: Color {
        if bgURL != nil { return Color.white.opacity(0.92) }
        // Dark silhouette on light panels (incl. white), white silhouette on dark.
        let panelHex = hasPanelColor ? stampBgColorHex : brandColorHex
        return Color.luminanceHex(panelHex) > 0.179 ? Color.black.opacity(0.8) : Color.white.opacity(0.92)
    }
    private var remaining: Int { max(0, required - current) }
    private var isReady: Bool { remaining == 0 && required > 0 }
    private var stampSlotSize: CGFloat {
        let n = min(required, 20)
        if n > 15 { return 20 }
        if n > 10 { return 24 }
        return 28
    }

    var body: some View {
        ZStack {
            frontFace
                .opacity(showBack ? 0 : 1)
                .rotation3DEffect(.degrees(showBack ? 180 : 0), axis: (x: 0, y: 1, z: 0), perspective: 0.6)
            backFace
                .opacity(showBack ? 1 : 0)
                .rotation3DEffect(.degrees(showBack ? 0 : -180), axis: (x: 0, y: 1, z: 0), perspective: 0.6)
        }
        .aspectRatio(1.586, contentMode: .fit)
        .overlay(alignment: .topTrailing) { flipButton }
        .shadow(color: .black.opacity(0.14), radius: 16, x: 0, y: 8)
    }

    // MARK: Front (identity)

    private var frontFace: some View {
        let ink = frontInk
        return ZStack {
            if let frontURL {
                AsyncImage(url: frontURL) { img in
                    img.resizable().scaledToFill()
                } placeholder: {
                    brandGradient
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .clipped()
                // Scrim keeps text legible over any photo.
                LinearGradient(colors: [.black.opacity(0.38), .clear, .clear, .black.opacity(0.45)],
                               startPoint: .top, endPoint: .bottom)
            } else {
                brandGradient
            }
            sheen
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 10) {
                    logoChip
                    Text((frontHeadline?.isEmpty == false ? frontHeadline! : businessName))
                        .font(.system(size: 20, weight: .heavy, design: .rounded))
                        .foregroundColor(ink)
                        .lineLimit(2)
                        .shadow(color: frontURL != nil ? .black.opacity(0.45) : .clear, radius: 4, x: 0, y: 1)
                    Spacer(minLength: 0)
                }
                Spacer(minLength: 0)
                if let sub = frontSubtext, !sub.isEmpty {
                    Text(sub)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(ink.opacity(0.95))
                        .lineLimit(2)
                        .shadow(color: frontURL != nil ? .black.opacity(0.5) : .clear, radius: 4, x: 0, y: 1)
                } else if frontURL == nil {
                    Text("Loyalty card")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(ink.opacity(0.7))
                }
            }
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    // MARK: Back (stamps)

    private var backFace: some View {
        ZStack {
            brandGradient
            sheen
            VStack(spacing: 10) {
                Text((backMessage?.isEmpty == false ? backMessage! : defaultBackMessage))
                    .font(.system(size: 13, weight: .semibold))
                    .multilineTextAlignment(.center)
                    .foregroundColor(backInk.opacity(0.92))
                    .lineLimit(2)
                    .padding(.horizontal, 28)   // clear the flip button
                stampPanel
                backFooter
            }
            .padding(16)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private var defaultBackMessage: String {
        if let rewardName, !rewardName.isEmpty { return "Collect \(required) for \(rewardName)" }
        return "Collect \(required) stamps for a reward"
    }

    private var stampPanel: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(hasPanelColor ? Color(hex: stampBgColorHex!) : cardColor)
            if !hasPanelColor && bgURL == nil {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(cardIsLight ? Color.black.opacity(0.14) : Color.white.opacity(0.14))
            }
            if let bgURL {
                AsyncImage(url: bgURL) { img in img.resizable().scaledToFill() }
                    placeholder: { Color.clear }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .clipped()
                RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Color.black.opacity(0.18))
            }
            StampGrid(icon: icon, filled: min(current, required), total: required,
                      inkColor: emptyStampColor, maxDisplay: 20, slotSize: stampSlotSize)
                .padding(12)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    @ViewBuilder private var backFooter: some View {
        if let memberName {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("MEMBER").font(.system(size: 9, weight: .bold)).foregroundColor(backInk.opacity(0.6))
                    Text(memberName).font(.system(size: 14, weight: .semibold)).foregroundColor(backInk).lineLimit(1)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("REWARDS").font(.system(size: 9, weight: .bold)).foregroundColor(backInk.opacity(0.6))
                    HStack(spacing: 4) {
                        Text("\(rewardsCount)").font(.system(size: 14, weight: .semibold)).foregroundColor(backInk)
                        Text("×").font(.system(size: 11)).foregroundColor(backInk.opacity(0.6))
                        Text(icon.isEmpty ? "☕" : icon).font(.system(size: 14))
                    }
                }
            }
        } else {
            HStack(spacing: 8) {
                Text("\(min(current, required)) / \(required)").font(.system(size: 14, weight: .bold)).foregroundColor(backInk)
                if isReady {
                    Text("READY")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(cardColor)
                        .padding(.horizontal, 7).padding(.vertical, 3)
                        .background(Capsule().fill(onCard))
                }
                Spacer()
                if let rewardName {
                    Text(remaining > 0 ? "\(remaining) more for \(rewardName)" : "Ready: \(rewardName)")
                        .font(.system(size: 11))
                        .foregroundColor(backInk.opacity(0.75))
                        .lineLimit(1)
                }
            }
        }
    }

    // MARK: Shared pieces

    @ViewBuilder private var logoChip: some View {
        if let logoUrl, let url = URL(string: logoUrl) {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(Color.white)
                .frame(width: 34, height: 34)
                .overlay(
                    AsyncImage(url: url) { img in img.resizable().scaledToFit() }
                        placeholder: { Color.clear }
                        .padding(3)
                )
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .shadow(color: .black.opacity(0.15), radius: 3, x: 0, y: 1)
        }
    }

    private var brandGradient: some View {
        ZStack {
            cardColor
            LinearGradient(colors: [Color.white.opacity(0.12), Color.clear, Color.black.opacity(0.22)],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
        }
    }

    private var sheen: some View {
        LinearGradient(colors: [Color.white.opacity(0.22), Color.clear],
                       startPoint: .topLeading, endPoint: .center)
            .allowsHitTesting(false)
    }

    private var flipButton: some View {
        Button {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.78)) { showBack.toggle() }
        } label: {
            Image(systemName: "arrow.left.arrow.right")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.white)
                .frame(width: 28, height: 28)
                .background(Color.black.opacity(0.32))
                .clipShape(Circle())
                .overlay(Circle().stroke(Color.white.opacity(0.4), lineWidth: 0.5))
        }
        .buttonStyle(.plain)
        .padding(10)
    }
}
