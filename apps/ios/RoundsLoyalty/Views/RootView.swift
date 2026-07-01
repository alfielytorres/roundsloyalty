import SwiftUI

struct RootView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var minSplashElapsed = false

    // Keep the branded splash up until both the session has resolved and a short
    // minimum has passed, so the logo is always visible on a cold launch.
    private var showSplash: Bool { !minSplashElapsed || sessionManager.isLoading }

    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            if !sessionManager.isLoading {
                if sessionManager.session == nil {
                    AuthView()
                } else {
                    CustomerTabView()
                }
            }

            if showSplash {
                SplashView()
                    .transition(.opacity)
                    .zIndex(1)
            }
        }
        .animation(.easeOut(duration: 0.35), value: showSplash)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
                minSplashElapsed = true
            }
        }
    }
}

/// Full-screen launch splash — the Rounds mark over the app background. Matches
/// the native UILaunchScreen colour so the hand-off is seamless.
struct SplashView: View {
    @State private var appeared = false

    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()
            VStack(spacing: 18) {
                RoundsLogoMark(size: 96)
                Text("Rounds")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(.primaryText)
            }
            .scaleEffect(appeared ? 1 : 0.94)
            .opacity(appeared ? 1 : 0)
        }
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) { appeared = true }
        }
    }
}
