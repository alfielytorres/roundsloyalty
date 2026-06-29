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
