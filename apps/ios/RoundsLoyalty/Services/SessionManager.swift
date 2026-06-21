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
        do {
            let current = try await supabase.auth.session
            self.session = current
            await fetchProfile(userId: current.user.id)
        } catch {
            // No active session on launch
        }
        self.isLoading = false

        // Stream auth state changes off the main actor to satisfy actor isolation
        let stream = await supabase.auth.authStateChanges
        for await (event, session) in stream {
            await MainActor.run {
                switch event {
                case .signedIn, .tokenRefreshed, .userUpdated:
                    self.session = session
                case .signedOut:
                    self.session = nil
                    self.profile = nil
                default:
                    break
                }
            }
            if (event == .signedIn || event == .tokenRefreshed || event == .userUpdated),
               let uid = session?.user.id {
                await fetchProfile(userId: uid)
            }
        }
    }

    func fetchProfile(userId: UUID) async {
        do {
            let fetched: Profile = try await supabase.database
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

    func reloadProfile() async {
        guard let userId = session?.user.id else { return }
        await fetchProfile(userId: userId)
    }

    func signOut() async throws {
        try await supabase.auth.signOut()
    }
}
