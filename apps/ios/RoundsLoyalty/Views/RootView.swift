import SwiftUI

struct RootView: View {
    @EnvironmentObject var sessionManager: SessionManager

    var body: some View {
        Group {
            if sessionManager.isLoading {
                ZStack {
                    Color.brandCream.ignoresSafeArea()
                    VStack(spacing: 16) {
                        RoundsLogoMark(size: 48)
                        ProgressView()
                            .tint(.black)
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
