import SwiftUI

struct HomeView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var memberships: [Membership] = []
    @State private var rewards: [RewardInstance] = []
    @State private var isLoading = true
    @State private var selectedMembership: Membership?
    @State private var selectedReward: RewardInstance?
    @State private var unreadCount = 0
    @State private var showNotifications = false

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 0..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        default: return "Good evening"
        }
    }

    private var firstName: String {
        let name = sessionManager.profile?.displayName ?? ""
        return name.split(separator: " ").first.map(String.init) ?? name
    }

    private var availableRewards: [RewardInstance] {
        rewards.filter { ["available", "collection_requested", "ready"].contains($0.status) }
    }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 20) {

                    // Top bar
                    HStack {
                        Image("AppLogo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 26, height: 26)
                        Spacer()
                        Button { showNotifications = true } label: {
                            ZStack(alignment: .topTrailing) {
                                Image(systemName: "bell")
                                    .font(.system(size: 20, weight: .medium))
                                    .foregroundColor(.primaryText)
                                if unreadCount > 0 {
                                    Text(unreadCount > 9 ? "9+" : "\(unreadCount)")
                                        .font(.system(size: 9, weight: .bold))
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 4)
                                        .padding(.vertical, 2)
                                        .background(Color.black.clipShape(Capsule()))
                                        .offset(x: 6, y: -4)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)

                    // Greeting
                    VStack(alignment: .leading, spacing: 4) {
                        Text(greeting)
                            .font(.system(size: 13))
                            .foregroundColor(.black.opacity(0.35))
                        Text(firstName.isEmpty ? "Welcome back" : firstName)
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundColor(.primaryText)
                        if availableRewards.count > 0 {
                            Text("\(availableRewards.count) reward\(availableRewards.count == 1 ? "" : "s") ready to collect")
                                .font(.system(size: 13))
                                .foregroundColor(.black.opacity(0.40))
                        }
                    }
                    .padding(.horizontal, 20)

                    if isLoading {
                        HStack { Spacer(); ProgressView().tint(.black.opacity(0.3)); Spacer() }
                            .padding(.top, 40)
                    } else {
                        if !memberships.isEmpty {
                            Text("YOUR ROUNDS")
                                .font(.system(size: 11, weight: .semibold))
                                .kerning(1.2)
                                .foregroundColor(.black.opacity(0.28))
                                .padding(.horizontal, 20)

                            VendorCardGrid(memberships: memberships, onTap: { selectedMembership = $0 })
                        }

                        if !availableRewards.isEmpty {
                            Text("READY TO COLLECT")
                                .font(.system(size: 11, weight: .semibold))
                                .kerning(1.2)
                                .foregroundColor(.black.opacity(0.28))
                                .padding(.horizontal, 20)

                            ForEach(availableRewards.prefix(3)) { reward in
                                ReadyToCollectCard(reward: reward)
                                    .padding(.horizontal, 20)
                                    .onTapGesture { selectedReward = reward }
                            }
                        }

                        if memberships.isEmpty {
                            VStack(spacing: 14) {
                                Image(systemName: "cup.and.saucer")
                                    .font(.system(size: 40))
                                    .foregroundColor(.black.opacity(0.15))
                                Text("No memberships yet")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.primaryText)
                                Text("Scan a store QR code to get started")
                                    .font(.system(size: 14))
                                    .foregroundColor(.black.opacity(0.35))
                                    .multilineTextAlignment(.center)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.top, 60)
                        }
                    }

                    Spacer(minLength: 100)
                }
            }
            .background(Color.appBackground.ignoresSafeArea())
            .navigationBarHidden(true)
            .task {
                await loadData()
                await loadUnreadCount()
                await PushNotificationManager.shared.requestPermission()
            }
            .refreshable { await loadData(); await loadUnreadCount() }
            .sheet(item: $selectedMembership) { VendorDetailView(membership: $0, memberName: sessionManager.profile?.displayName) }
            .sheet(item: $selectedReward) { reward in
                CollectionSheet(
                    reward: reward,
                    preloadedMembership: memberships.first(where: { $0.vendorId == reward.vendorId })
                )
            }
            .sheet(isPresented: $showNotifications, onDismiss: { Task { await loadUnreadCount() } }) {
                NotificationsView()
            }
        }
    }

    private func loadData() async {
        guard let userId = sessionManager.session?.user.id else { return }
        isLoading = true
        async let membershipsTask: [Membership] = (try? await supabase.database
            .from("customer_vendor_memberships")
            .select("*, vendors(id, business_name, brand_color, logo_url, stamp_icon, card_background_url, stamp_bg_color), loyalty_programs(id, name, rounds_required, reward_name, default_round_value)")
            .eq("customer_id", value: userId).eq("status", value: "active").execute().value) ?? []
        async let rewardsTask: [RewardInstance] = (try? await supabase.database
            .from("reward_instances")
            .select("*, vendors(id, business_name)")
            .eq("customer_id", value: userId)
            .in("status", value: ["available", "collection_requested", "ready"]).execute().value) ?? []
        memberships = await membershipsTask
        rewards = await rewardsTask
        isLoading = false
    }

    private func loadUnreadCount() async {
        guard let userId = sessionManager.session?.user.id else { return }
        // Count rows where read_at is null
        struct CountResult: Decodable { }
        let result = try? await supabase.database
            .from("customer_notifications")
            .select("id", head: false, count: .exact)
            .eq("customer_id", value: userId)
            .is("read_at", value: "null")
            .execute()
        unreadCount = result?.count ?? 0
    }
}

// MARK: - Vendor Card Grid

private struct VendorCardGrid: View {
    let memberships: [Membership]
    let onTap: (Membership) -> Void

    var body: some View {
        VStack(spacing: 10) {
            if let first = memberships.first {
                VendorCard(membership: first, isFeatured: true)
                    .padding(.horizontal, 20)
                    .onTapGesture { onTap(first) }
            }
            if memberships.count > 1 {
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                    ForEach(Array(memberships.dropFirst()), id: \.id) { m in
                        VendorCard(membership: m, isFeatured: false)
                            .onTapGesture { onTap(m) }
                    }
                }
                .padding(.horizontal, 20)
            }
        }
    }
}

// MARK: - Vendor Card

private struct VendorCard: View {
    let membership: Membership
    let isFeatured: Bool

    private var accent: Color { Color.vendorAccent(membership.vendor?.brandColor) }
    private var required: Int { membership.program?.roundsRequired ?? 10 }
    private var current: Int { membership.currentRounds }
    private var remaining: Int { max(0, required - current) }
    private var progress: Double {
        guard required > 0 else { return 0 }
        return min(Double(current) / Double(required), 1.0)
    }
    private var icon: String { membership.vendor?.stampIcon ?? "☕" }

    var body: some View {
        if isFeatured { featured } else { compact }
    }

    // Designed stamp card — shared with the vendor-detail sheet and web preview.
    private var featured: some View {
        LoyaltyCardView(
            businessName: membership.vendor?.businessName ?? "Store",
            logoUrl: membership.vendor?.logoUrl,
            brandColorHex: membership.vendor?.brandColor,
            stampBgColorHex: membership.vendor?.stampBgColor,
            backgroundUrl: membership.vendor?.cardBackgroundUrl,
            icon: icon,
            current: current,
            required: required,
            rewardName: membership.program?.rewardName
        )
    }

    // Compact card for additional memberships.
    private var compact: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 24)
                .fill(Color.white.opacity(0.80))
                .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color.white, lineWidth: 1))
                .shadow(color: .black.opacity(0.05), radius: 12, x: 0, y: 4)

            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 6) {
                    if let logoUrl = membership.vendor?.logoUrl, let url = URL(string: logoUrl) {
                        RoundedRectangle(cornerRadius: 5)
                            .fill(Color.white)
                            .frame(width: 22, height: 22)
                            .overlay(
                                AsyncImage(url: url) { img in img.resizable().scaledToFit() }
                                    placeholder: { Color.clear }
                                    .padding(2)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 5))
                    }
                    Text(membership.vendor?.businessName ?? "Store")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.black.opacity(0.40))
                        .lineLimit(1)
                    Spacer()
                    if remaining == 0 && required > 0 {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 14))
                            .foregroundColor(accent)
                    }
                }

                Spacer()

                VStack(alignment: .leading, spacing: 1) {
                    Text("\(current)")
                        .font(.system(size: 56, weight: .heavy, design: .rounded))
                        .foregroundColor(.primaryText)
                        .minimumScaleFactor(0.7)
                    Text("rounds")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.black.opacity(0.28))
                }

                Spacer()

                VStack(alignment: .leading, spacing: 5) {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 2).fill(Color.black.opacity(0.08)).frame(height: 3)
                            RoundedRectangle(cornerRadius: 2).fill(accent).frame(width: geo.size.width * progress, height: 3)
                        }
                    }
                    .frame(height: 3)
                    if remaining > 0, let rewardName = membership.program?.rewardName {
                        Text("\(remaining) more for \(rewardName)")
                            .font(.system(size: 11))
                            .foregroundColor(.black.opacity(0.35))
                            .lineLimit(1)
                    } else if let rewardName = membership.program?.rewardName {
                        Text("Ready: \(rewardName)")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(accent)
                            .lineLimit(1)
                    }
                }
            }
            .padding(16)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 155)
    }
}

// MARK: - Ready to Collect Card

private struct ReadyToCollectCard: View {
    let reward: RewardInstance

    private var accent: Color { Color.vendorAccent(reward.vendor?.brandColor) }

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(accent.opacity(0.12))
                    .frame(width: 44, height: 44)
                Image(systemName: "gift.fill")
                    .font(.system(size: 18))
                    .foregroundColor(accent)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text("Ready to collect")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.black.opacity(0.35))
                Text(reward.rewardName)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.primaryText)
                if let vendorName = reward.vendor?.businessName {
                    Text(vendorName)
                        .font(.system(size: 13))
                        .foregroundColor(.black.opacity(0.40))
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(accent.opacity(0.5))
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white.opacity(0.80))
                .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.white, lineWidth: 1))
                .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 3)
        )
    }
}
