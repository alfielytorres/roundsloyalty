import Foundation
import Supabase

@MainActor
final class SessionManager: ObservableObject {
    @Published var session: Session?
    @Published var profile: Profile?
    @Published var isLoading: Bool = true

    init() {
        Task {
            await listenForAuthChanges()
        }
    }

    private func listenForAuthChanges() async {
        // Seed the current session on launch
        do {
            let current = try await supabase.auth.session
            self.session = current
            await fetchProfile(userId: current.user.id)
        } catch {
            // No active session
        }
        self.isLoading = false

        // Stream changes
        for await (event, session) in supabase.auth.authStateChanges {
            switch event {
            case .signedIn, .tokenRefreshed, .userUpdated:
                self.session = session
                if let uid = session?.user.id {
                    await fetchProfile(userId: uid)
                }
            case .signedOut:
                self.session = nil
                self.profile = nil
            default:
                break
            }
        }
    }

    func fetchProfile(userId: UUID) async {
        do {
            let fetched: Profile = try await supabase
                .from("profiles")
                .select()
                .eq("id", value: userId)
                .single()
                .execute()
                .value
            self.profile = fetched
        } catch {
            print("Failed to fetch profile: \(error)")
        }
    }

    func signOut() async throws {
        try await supabase.auth.signOut()
    }
}
