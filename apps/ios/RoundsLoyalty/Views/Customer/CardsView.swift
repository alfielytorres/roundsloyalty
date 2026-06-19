import SwiftUI

struct BalanceSummary: Codable {
    let stamps: Int
    let points: Int
}

struct VendorMembership: Codable, Identifiable {
    let id: UUID
    let vendorId: UUID
    let status: String
    let activatedAt: Date?
    var vendor: VendorInfo?
    var balance: BalanceSummary?

    enum CodingKeys: String, CodingKey {
        case id
        case vendorId = "vendor_id"
        case status
        case activatedAt = "activated_at"
        case vendor = "vendors"
        case balance = "loyalty_balances"
    }
}

struct VendorInfo: Codable, Identifiable {
    let id: UUID
    let businessName: String
    let description: String?
    let logoUrl: String?
    let address: String?

    enum CodingKeys: String, CodingKey {
        case id
        case businessName = "business_name"
        case description
        case logoUrl = "logo_url"
        case address
    }
}

struct CardsView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var memberships: [VendorMembership] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.brandCream.ignoresSafeArea()

                if isLoading {
                    ProgressView().tint(.brandGreen)
                } else if memberships.isEmpty {
                    emptyState
                } else {
                    cardList
                }
            }
            .navigationTitle("My Cards")
            .navigationBarTitleDisplayMode(.large)
            .toolbar { CustomerToolbarItems() }
            .task { await loadMemberships() }
            .refreshable { await loadMemberships() }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "creditcard")
                .font(.system(size: 48))
                .foregroundColor(.brandTaupe)
            Text("No loyalty cards yet")
                .font(.headline)
                .foregroundColor(.black)
            Text("Scan a store's QR code to get started")
                .font(.subheadline)
                .foregroundColor(.brandTaupe)
                .multilineTextAlignment(.center)
        }
        .padding()
    }

    private var cardList: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(memberships) { membership in
                    MembershipCardRow(membership: membership)
                }
            }
            .padding()
        }
    }

    private func loadMemberships() async {
        guard let userId = sessionManager.session?.user.id else { return }
        isLoading = true
        do {
            let fetched: [VendorMembership] = try await supabase.database
                .from("customer_vendor_memberships")
                .select("*, vendors(id, business_name, description, logo_url, address), loyalty_balances(stamps, points)")
                .eq("customer_id", value: userId)
                .eq("status", value: "active")
                .execute()
                .value
            memberships = fetched
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

struct MembershipCardRow: View {
    let membership: VendorMembership

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(membership.vendor?.businessName ?? "Unknown Store")
                        .font(.headline)
                        .foregroundColor(.black)
                    if let address = membership.vendor?.address {
                        Text(address)
                            .font(.caption)
                            .foregroundColor(.brandTaupe)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundColor(.brandTaupe)
            }

            HStack(spacing: 20) {
                Label("\(membership.balance?.stamps ?? 0) stamps", systemImage: "seal.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.black)
                Label("\(membership.balance?.points ?? 0) pts", systemImage: "star.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.black)
            }
        }
        .padding()
        .glassCard()
    }
}

struct StampGrid: View {
    let collected: Int
    let required: Int

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 5)

    var body: some View {
        LazyVGrid(columns: columns, spacing: 8) {
            ForEach(0..<required, id: \.self) { index in
                Circle()
                    .fill(index < collected ? Color.brandGreen : Color.brandLightGreen)
                    .frame(height: 28)
                    .overlay(Circle().stroke(Color.brandGreen.opacity(index < collected ? 0 : 0.3), lineWidth: 1))
                    .overlay(
                        Image(systemName: index < collected ? "checkmark" : "")
                            .font(.caption2.weight(.bold))
                            .foregroundColor(.white)
                    )
            }
        }
    }
}
