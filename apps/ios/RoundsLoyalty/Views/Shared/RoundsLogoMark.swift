import SwiftUI

struct RoundsLogoMark: View {
    var size: CGFloat = 48
    // Kept for source compatibility with existing call sites. The Rounds mark is
    // now a full-colour lime squircle, so it renders as-is and ignores any tint.
    var color: Color = .brandGreen

    var body: some View {
        Image("AppLogo")
            .resizable()
            .scaledToFit()
            .frame(width: size, height: size)
    }
}

/// Branded loading indicator — the Rounds mark gently breathing. Use this
/// instead of a bare spinner wherever content is loading.
struct RoundsLoadingView: View {
    var size: CGFloat = 52
    var label: String? = nil

    @State private var pulse = false

    var body: some View {
        VStack(spacing: 12) {
            RoundsLogoMark(size: size)
                .clipShape(RoundedRectangle(cornerRadius: size * 0.226))
                .scaleEffect(pulse ? 1.0 : 0.88)
                .opacity(pulse ? 1.0 : 0.55)
            if let label {
                Text(label)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.secondaryText)
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) {
                pulse = true
            }
        }
    }
}
