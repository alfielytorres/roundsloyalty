import SwiftUI

struct RootView: View {
    @EnvironmentObject var sessionManager: SessionManager

    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            if sessionManager.isLoading {
                VStack(spacing: 16) {
                    RoundsLogoMark(size: 48, color: .primaryText)
                    ProgressView()
                        .tint(.primaryText)
                }
            } else if sessionManager.session == nil {
                AuthView()
            } else {
                CustomerTabView()
            }
        }
    }
}
