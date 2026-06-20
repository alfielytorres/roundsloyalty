import SwiftUI

struct NotificationsView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var notifications: [CustomerNotification] = []
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                if isLoading {
                    ProgressView().tint(.black.opacity(0.3))
                } else if notifications.isEmpty {
                    VStack(spacing: 14) {
                        Image(systemName: "bell.slash")
                            .font(.system(size: 44))
                            .foregroundColor(.black.opacity(0.15))
                        Text("No notifications yet")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.primaryText)
                        Text("Notifications appear here when a store stamps your card")
                            .font(.system(size: 14))
                            .foregroundColor(.black.opacity(0.35))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                    }
                } else {
                    ScrollView(showsIndicators: false) {
                        LazyVStack(spacing: 10) {
                            ForEach(notifications) { n in
                                NotificationRow(notification: n)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 16)
                        .padding(.bottom, 80)
                    }
                }
            }
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.large)
            .task { await loadAndMarkRead() }
            .refreshable { await loadAndMarkRead() }
        }
    }

    private func loadAndMarkRead() async {
        guard let userId = sessionManager.session?.user.id else { return }
        isLoading = true
        notifications = (try? await supabase.database
            .from("customer_notifications")
            .select()
            .eq("customer_id", value: userId)
            .order("created_at", ascending: false)
            .limit(100)
            .execute()
            .value) ?? []
        isLoading = false

        // Mark unread ones as read
        let unreadIds = notifications.filter { $0.readAt == nil }.map { $0.id.uuidString }
        guard !unreadIds.isEmpty else { return }
        try? await supabase.database
            .from("customer_notifications")
            .update(["read_at": ISO8601DateFormatter().string(from: Date())])
            .in("id", values: unreadIds)
            .execute()
    }
}

// MARK: - Row

private struct NotificationRow: View {
    let notification: CustomerNotification

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Unread dot
            Circle()
                .fill(notification.isRead ? Color.clear : Color.black.opacity(0.7))
                .frame(width: 7, height: 7)
                .padding(.top, 6)

            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .firstTextBaseline) {
                    Text(notification.title)
                        .font(.system(size: 14, weight: notification.isRead ? .regular : .semibold))
                        .foregroundColor(.primaryText)
                        .lineLimit(2)
                    Spacer()
                    Text(notification.createdAt.relativeLabel)
                        .font(.system(size: 11))
                        .foregroundColor(.black.opacity(0.30))
                }
                Text(notification.body)
                    .font(.system(size: 13))
                    .foregroundColor(.black.opacity(0.50))
                    .lineLimit(3)

                // Status pill
                StatusPill(status: notification.status, label: notification.statusLabel)
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(Color.white.opacity(notification.isRead ? 0.60 : 0.85))
                .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.white, lineWidth: 1))
                .shadow(color: .black.opacity(0.04), radius: 8, x: 0, y: 2)
        )
    }
}

private struct StatusPill: View {
    let status: String
    let label: String

    private var color: Color {
        switch status {
        case "delivered": return Color(red: 0.2, green: 0.7, blue: 0.4)
        case "sent":      return Color(red: 0.2, green: 0.5, blue: 0.9)
        case "failed":    return Color(red: 0.85, green: 0.25, blue: 0.25)
        default:          return Color.black.opacity(0.30)
        }
    }

    var body: some View {
        HStack(spacing: 4) {
            Circle().fill(color).frame(width: 5, height: 5)
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(color)
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(color.opacity(0.10).clipShape(Capsule()))
    }
}

// MARK: - Relative date

private extension Date {
    var relativeLabel: String {
        let diff = Date().timeIntervalSince(self)
        if diff < 60 { return "now" }
        if diff < 3600 { return "\(Int(diff / 60))m ago" }
        if diff < 86400 { return "\(Int(diff / 3600))h ago" }
        let days = Int(diff / 86400)
        return days == 1 ? "Yesterday" : "\(days)d ago"
    }
}
