import SwiftUI

struct RoundsLogoMark: View {
    var size: CGFloat = 48
    var color: Color = .brandGreen

    var body: some View {
        Image("AppLogo")
            .resizable()
            .renderingMode(.template)
            .scaledToFit()
            .foregroundColor(color)
            .frame(width: size, height: size)
    }
}
