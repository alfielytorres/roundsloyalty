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
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(Color(hex: "#1D1D1F"))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(Capsule().fill(Color.roundsLime))
                                .padding(.top, 2)
                        }
                    }
                    .padding(.horizontal, 20)

                    if isLoading {
                        HStack { Spacer(); RoundsLoadingView(size: 48); Spacer() }
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
                                RoundsLogoMark(size: 64)
                                    .clipShape(RoundedRectangle(cornerRadius: 14.5))
                                    .shadow(color: Color.roundsLime.opacity(0.4), radius: 14, x: 0, y: 6)
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
            .select("*, vendors(id, business_name, brand_color, logo_url, stamp_icon, card_background_url, stamp_bg_color, card_front_url, card_front_headline, card_front_subtext, card_back_message, card_front_text_color, card_back_text_color), loyalty_programs(id, name, rounds_required, reward_name, default_round_value)")
            .eq("customer_id", value: userId).eq("status", value: "active")
            .order("updated_at", ascending: false)   // most recent activity first
            .execute().value) ?? []
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
        // Every store gets the full designed loyalty card, newest activity on top.
        VStack(spacing: 14) {
            ForEach(memberships, id: \.id) { m in
                VendorCard(membership: m)
                    .padding(.horizontal, 20)
                    .onTapGesture { onTap(m) }
            }
        }
    }
}

// MARK: - Vendor Card

private struct VendorCard: View {
    let membership: Membership

    private var required: Int { membership.program?.roundsRequired ?? 10 }
    private var icon: String { membership.vendor?.stampIcon ?? "☕" }

    var body: some View {
        // Designed stamp card — shared with the vendor-detail sheet and web preview.
        LoyaltyCardView(
            businessName: membership.vendor?.businessName ?? "Store",
            logoUrl: membership.vendor?.logoUrl,
            brandColorHex: membership.vendor?.brandColor,
            stampBgColorHex: membership.vendor?.stampBgColor,
            backgroundUrl: membership.vendor?.cardBackgroundUrl,
            icon: icon,
            current: membership.currentRounds,
            required: required,
            rewardName: membership.program?.rewardName,
            frontUrl: membership.vendor?.cardFrontUrl,
            frontHeadline: membership.vendor?.cardFrontHeadline,
            frontSubtext: membership.vendor?.cardFrontSubtext,
            backMessage: membership.vendor?.cardBackMessage,
            frontTextColor: membership.vendor?.cardFrontTextColor,
            backTextColor: membership.vendor?.cardBackTextColor
        )
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
