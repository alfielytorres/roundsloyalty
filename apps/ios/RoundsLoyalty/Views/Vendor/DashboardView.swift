import SwiftUI

struct DashboardStats {
    var totalCustomers: Int = 0
    var visitsThisWeek: Int = 0
    var totalStampsGiven: Int = 0
}

struct DashboardView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var business: Business?
    @State private var stats = DashboardStats()
    @State private var recentActivity: [RecentActivity] = []
    @State private var isLoading = true
    @State private var showComposeOffer = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.brandCream.ignoresSafeArea()

                if isLoading {
                    ProgressView().tint(.brandGreen)
                } else if business == nil {
                    VStack(spacing: 20) {
                        Image(systemName: "storefront")
                            .font(.system(size: 56))
                            .foregroundColor(.brandTaupe)
                        Text("Set up your store")
                            .font(.title2.bold())
                            .foregroundColor(.brandDarkGreen)
                        Text("Add your business details to start accepting customers")
                            .font(.subheadline)
                            .foregroundColor(.brandTaupe)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                } else {
                    ScrollView {
                        VStack(spacing: 20) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(business?.name ?? "")
                                        .font(.title2.bold())
                                        .foregroundColor(.brandDarkGreen)
                                    if let address = business?.address {
                                        Label(address, systemImage: "mappin.circle")
                                            .font(.caption)
                                            .foregroundColor(.brandTaupe)
                                    }
                                }
                                Spacer()
                            }
                            .padding(.horizontal)

                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                                StatCard(title: "Customers", value: "\(stats.totalCustomers)", icon: "person.2.fill")
                                StatCard(title: "This Week", value: "\(stats.visitsThisWeek)", icon: "calendar")
                                StatCard(title: "Stamps", value: "\(stats.totalStampsGiven)", icon: "star.fill")
                            }
                            .padding(.horizontal)

                            Button {
                                showComposeOffer = true
                            } label: {
                                Label("Send an Offer", systemImage: "megaphone.fill")
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.brandGreen)
                                    .foregroundColor(.white)
                                    .font(.headline)
                                    .cornerRadius(14)
                            }
                            .padding(.horizontal)

                            VStack(alignment: .leading, spacing: 12) {
                                Text("Recent Activity")
                                    .font(.headline)
                                    .foregroundColor(.brandDarkGreen)
                                    .padding(.horizontal)

                                if recentActivity.isEmpty {
                                    Text("No recent visits")
                                        .font(.subheadline)
                                        .foregroundColor(.brandTaupe)
                                        .padding(.horizontal)
                                } else {
                                    ForEach(recentActivity) { activity in
                                        ActivityRow(activity: activity)
                                    }
                                }
                            }
                            .padding(.bottom)
                        }
                        .padding(.top)
                    }
                }
            }
            .navigationTitle("Dashboard")
            .task { await loadDashboard() }
            .refreshable { await loadDashboard() }
            .sheet(isPresented: $showComposeOffer) {
                ComposeOfferView(businessId: business?.id)
            }
        }
    }

    private func loadDashboard() async {
        guard let userId = sessionManager.session?.user.id else { return }
        isLoading = true
        do {
            struct BusinessId: Codable { let id: UUID }
            let businesses: [Business] = try await supabase.database
                .from("businesses")
                .select()
                .eq("owner_id", value: userId)
                .limit(1)
                .execute()
                .value
            let biz = businesses.first
            business = biz

            guard let bizId = biz?.id else {
                isLoading = false
                return
            }

            struct IdRow: Codable { let id: UUID }
            let customerRows: [IdRow] = try await supabase.database
                .from("vendor_customer_segments")
                .select("customer_id")
                .eq("business_id", value: bizId)
                .execute()
                .value
            let customerCount = customerRows.count

            let weekAgo = Calendar.current.date(byAdding: .weekOfYear, value: -1, to: Date()) ?? Date(timeIntervalSinceNow: -7 * 24 * 3600)
            struct VisitId: Codable { let id: UUID }
            let weekVisitRows: [VisitId] = try await supabase.database
                .from("visit_events")
                .select("id")
                .eq("business_id", value: bizId)
                .gte("created_at", value: weekAgo.ISO8601Format())
                .execute()
                .value
            let weekVisits = weekVisitRows.count

            struct StampRow: Codable { let stampsAdded: Int; enum CodingKeys: String, CodingKey { case stampsAdded = "stamps_added" } }
            let stampRows: [StampRow] = try await supabase.database
                .from("visit_events")
                .select("stamps_added")
                .eq("business_id", value: bizId)
                .execute()
                .value
            let totalStamps = stampRows.reduce(0) { $0 + $1.stampsAdded }

            stats = DashboardStats(
                totalCustomers: customerCount,
                visitsThisWeek: weekVisits,
                totalStampsGiven: totalStamps
            )

            struct RawActivity: Codable {
                let id: UUID
                let createdAt: Date
                let stampsAdded: Int
                let loyaltyCards: RawLoyaltyCard?
                enum CodingKeys: String, CodingKey {
                    case id; case createdAt = "created_at"; case stampsAdded = "stamps_added"
                    case loyaltyCards = "loyalty_cards"
                }
            }
            struct RawLoyaltyCard: Codable { let profiles: RawProfile? }
            struct RawProfile: Codable {
                let displayName: String?
                enum CodingKeys: String, CodingKey { case displayName = "display_name" }
            }

            let rawActivities: [RawActivity] = try await supabase.database
                .from("visit_events")
                .select("id, created_at, stamps_added, loyalty_cards!inner(profiles!inner(display_name))")
                .eq("business_id", value: bizId)
                .order("created_at", ascending: false)
                .limit(10)
                .execute()
                .value

            recentActivity = rawActivities.map {
                RecentActivity(
                    id: $0.id,
                    createdAt: $0.createdAt,
                    stampsAdded: $0.stampsAdded,
                    customerName: $0.loyaltyCards?.profiles?.displayName
                )
            }
        } catch {
            print("Dashboard load error: \(error)")
        }
        isLoading = false
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.brandGreen)
            Text(value)
                .font(.title2.bold())
                .foregroundColor(.brandDarkGreen)
            Text(title)
                .font(.caption)
                .foregroundColor(.brandTaupe)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .glassCard(cornerRadius: 14)
    }
}

struct ActivityRow: View {
    let activity: RecentActivity

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.brandGreen.opacity(0.2))
                    .frame(width: 40, height: 40)
                Image(systemName: "star.fill")
                    .foregroundColor(.brandGreen)
                    .font(.subheadline)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(activity.customerName ?? "Anonymous")
                    .font(.subheadline.weight(.medium))
                    .foregroundColor(.brandDarkGreen)
                Text("\(activity.stampsAdded) stamp\(activity.stampsAdded == 1 ? "" : "s") added")
                    .font(.caption)
                    .foregroundColor(.brandTaupe)
            }
            Spacer()
            Text(activity.createdAt.formatted(.relative(presentation: .named)))
                .font(.caption2)
                .foregroundColor(.brandTaupe)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .glassCard(cornerRadius: 12)
        .padding(.horizontal)
    }
}
