import SwiftUI

struct RootView: View {
    @EnvironmentObject var sessionManager: SessionManager

    var body: some View {
        Group {
            if sessionManager.isLoading {
                ZStack {
                    Color.brandCream.ignoresSafeArea()
                    VStack(spacing: 16) {
                        Image(systemName: "cup.and.saucer.fill")
                            .font(.system(size: 48))
                            .foregroundColor(.brandGreen)
                        ProgressView()
                            .tint(.brandGreen)
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
