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

/// Full-screen launch splash — the Rounds mark over the app background. The
/// logo is pinned at the same size/position as the native UILaunchScreen image
/// (128pt, centred) so the hand-off is invisible; only the wordmark animates in.
struct SplashView: View {
    @State private var appeared = false

    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            RoundsLogoMark(size: 128)
                .shadow(color: .black.opacity(0.10), radius: 18, x: 0, y: 10)

            VStack {
                Spacer()
                Text("Weekends Club")
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                    .foregroundColor(.primaryText)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 8)
                    .padding(.bottom, 80)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.45).delay(0.15)) { appeared = true }
        }
    }
}
