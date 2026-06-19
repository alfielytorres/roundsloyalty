import SwiftUI

struct CustomerProfileView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var consents: [DataConsent] = []
    @State private var isLoading = true
    @State private var isSigningOut = false

    var profile: Profile? { sessionManager.profile }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.brandCream.ignoresSafeArea()

                List {
                    // Profile header
                    Section {
                        HStack(spacing: 16) {
                            ZStack {
                                Circle()
                                    .fill(Color.brandGreen.opacity(0.2))
                                    .frame(width: 64, height: 64)
                                Text(initials)
                                    .font(.title2.bold())
                                    .foregroundColor(.brandGreen)
                            }
                            VStack(alignment: .leading, spacing: 4) {
                                Text(profile?.displayName ?? "Customer")
                                    .font(.headline)
                                    .foregroundColor(.brandDarkGreen)
                                Text(sessionManager.session?.user.email ?? "")
                                    .font(.subheadline)
                                    .foregroundColor(.brandTaupe)
                            }
                        }
                        .padding(.vertical, 8)
                    }
                    .listRowBackground(Color.white.opacity(0.7))

                    // Data consents
                    Section(header: Text("My Data").foregroundColor(.brandTaupe)) {
                        if isLoading {
                            HStack {
                                Spacer()
                                ProgressView().tint(.brandGreen)
                                Spacer()
                            }
                        } else if consents.isEmpty {
                            Text("You haven't shared data with any stores yet.")
                                .font(.subheadline)
                                .foregroundColor(.brandTaupe)
                        } else {
                            ForEach(consents) { consent in
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(consent.business?.name ?? "Unknown Store")
                                            .font(.subheadline)
                                            .foregroundColor(.brandDarkGreen)
                                        Text("Sharing visit data & eligible for offers")
                                            .font(.caption)
                                            .foregroundColor(.brandTaupe)
                                    }
                                    Spacer()
                                    Button("Withdraw") {
                                        Task { await withdrawConsent(consentId: consent.id) }
                                    }
                                    .font(.caption.weight(.semibold))
                                    .foregroundColor(.red)
                                }
                            }
                        }
                    }
                    .listRowBackground(Color.white.opacity(0.7))

                    // Sign out
                    Section {
                        Button(role: .destructive) {
                            Task { await signOut() }
                        } label: {
                            HStack {
                                if isSigningOut {
                                    ProgressView().tint(.red)
                                } else {
                                    Label("Sign Out", systemImage: "arrow.right.square")
                                }
                            }
                        }
                    }
                    .listRowBackground(Color.white.opacity(0.7))
                }
                .listStyle(.insetGrouped)
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("Profile")
            .toolbar { CustomerToolbarItems() }
            .task { await loadConsents() }
        }
    }

    private var initials: String {
        let name = profile?.displayName ?? "C"
        return name.split(separator: " ")
            .compactMap { $0.first.map { String($0) } }
            .prefix(2)
            .joined()
            .uppercased()
    }

    private func loadConsents() async {
        guard let userId = sessionManager.session?.user.id else { return }
        do {
            let fetched: [DataConsent] = try await supabase.database
                .from("data_consents")
                .select("*, businesses(id, name)")
                .eq("customer_id", value: userId)
                .is("withdrawn_at", value: "null")
                .execute()
                .value
            consents = fetched
        } catch {
            print("Failed to load consents: \(error)")
        }
        isLoading = false
    }

    private func withdrawConsent(consentId: UUID) async {
        do {
            try await supabase.database
                .from("data_consents")
                .update(["withdrawn_at": Date().ISO8601Format()])
                .eq("id", value: consentId)
                .execute()
            consents.removeAll { $0.id == consentId }
        } catch {
            print("Failed to withdraw consent: \(error)")
        }
    }

    private func signOut() async {
        isSigningOut = true
        try? await sessionManager.signOut()
        isSigningOut = false
    }
}
