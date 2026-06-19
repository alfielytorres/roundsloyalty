import SwiftUI

/// Rounds brand logo mark. Swap Image("RoundsLogo") in when the asset is added to Assets.xcassets.
struct RoundsLogoMark: View {
    var size: CGFloat = 48
    var color: Color = .brandGreen

    var body: some View {
        // Replace with: Image("RoundsLogo").resizable().scaledToFit().frame(width: size, height: size)
        Text("R")
            .font(.system(size: size * 0.6, weight: .black, design: .rounded))
            .foregroundColor(color)
            .frame(width: size, height: size)
    }
}
