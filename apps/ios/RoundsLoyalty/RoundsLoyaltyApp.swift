import SwiftUI

@main
struct RoundsLoyaltyApp: App {
    @StateObject private var sessionManager = SessionManager()

    init() {
        configureNavigationBar()
        configureTabBar()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(sessionManager)
                .appTypography()
                .preferredColorScheme(.light)
        }
    }

    private func configureNavigationBar() {
        let appearance = UINavigationBarAppearance()
        appearance.configureWithTransparentBackground()

        // Inter-SemiBold for nav title, tight tracking
        let titleFont = UIFont(name: "Inter-SemiBold", size: 17)
            ?? UIFont.systemFont(ofSize: 17, weight: .semibold)
        let largeTitleFont = UIFont(name: "Inter-Bold", size: 34)
            ?? UIFont.systemFont(ofSize: 34, weight: .bold)

        appearance.titleTextAttributes = [
            .font: titleFont,
            .kern: -0.4,
            .foregroundColor: UIColor.black
        ]
        appearance.largeTitleTextAttributes = [
            .font: largeTitleFont,
            .kern: -0.8,
            .foregroundColor: UIColor.black
        ]

        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        UINavigationBar.appearance().compactAppearance = appearance
    }

    private func configureTabBar() {
        let appearance = UITabBarAppearance()
        appearance.configureWithTransparentBackground()
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
}
