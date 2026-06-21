import SwiftUI
import UIKit

@main
struct RoundsLoyaltyApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var sessionManager = SessionManager()

    init() {
        configureNavigationBar()
        configureTabBar()
        UIView.appearance().tintColor = UIColor.black
        UIWindow.appearance().backgroundColor = UIColor(red: 0.961, green: 0.961, blue: 0.969, alpha: 1) // #F5F5F7
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(sessionManager)
                .appTypography()
                .preferredColorScheme(.light)
                .onReceive(NotificationCenter.default.publisher(for: .didReceivePushToken)) { note in
                    guard
                        let deviceToken = note.object as? Data,
                        let userId = sessionManager.session?.user.id
                    else { return }
                    Task { await PushNotificationManager.shared.saveToken(deviceToken, userId: userId) }
                }
        }
    }

    private func configureNavigationBar() {
        let appearance = UINavigationBarAppearance()
        appearance.configureWithTransparentBackground()
        let titleFont = UIFont(name: "Inter-SemiBold", size: 17)
            ?? UIFont.systemFont(ofSize: 17, weight: .semibold)
        let largeTitleFont = UIFont(name: "Inter-Bold", size: 34)
            ?? UIFont.systemFont(ofSize: 34, weight: .bold)
        appearance.titleTextAttributes = [.font: titleFont, .kern: -0.4, .foregroundColor: UIColor.black]
        appearance.largeTitleTextAttributes = [.font: largeTitleFont, .kern: -0.8, .foregroundColor: UIColor.black]
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

// MARK: - App Delegate

extension Notification.Name {
    static let didReceivePushToken = Notification.Name("didReceivePushToken")
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        NotificationCenter.default.post(name: .didReceivePushToken, object: deviceToken)
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("Failed to register for remote notifications: \(error)")
    }
}
