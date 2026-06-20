import UIKit
import UserNotifications

@MainActor
final class PushNotificationManager: NSObject, ObservableObject {
    static let shared = PushNotificationManager()

    @Published var permissionGranted = false

    override private init() {
        super.init()
    }

    func requestPermission() async {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            permissionGranted = granted
            if granted {
                await MainActor.run { UIApplication.shared.registerForRemoteNotifications() }
            }
        } catch {
            print("Push permission error: \(error)")
        }
    }

    func saveToken(_ deviceToken: Data, userId: UUID) async {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        do {
            try await supabase.database
                .from("push_tokens")
                .upsert(
                    ["customer_id": userId.uuidString, "token": token, "platform": "ios",
                     "updated_at": ISO8601DateFormatter().string(from: Date())],
                    onConflict: "customer_id,token"
                )
                .execute()
        } catch {
            print("Failed to save push token: \(error)")
        }
    }
}

extension PushNotificationManager: UNUserNotificationCenterDelegate {
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler handler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show banner even when app is in foreground
        handler([.banner, .sound, .badge])
    }
}
