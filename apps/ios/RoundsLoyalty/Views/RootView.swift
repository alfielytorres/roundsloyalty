import SwiftUI

struct RootView: View {
    @EnvironmentObject var sessionManager: SessionManager

    var body: some View {
        Group {
            if sessionManager.isLoading {
                ZStack {
                    Color.appBackground.ignoresSafeArea()
                    VStack(spacing: 16) {
                        RoundsLogoMark(size: 48, color: .white)
                        ProgressView()
                            .tint(.white)
                    }
                }
            } else if sessionManager.session == nil {
                AuthView()
            } else {
                CustomerTabView()
            }
        }
        .animation(.easeInOut, value: sessionManager.session?.user.id)
    }
}
