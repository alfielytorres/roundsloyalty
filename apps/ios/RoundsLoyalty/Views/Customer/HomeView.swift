import SwiftUI

struct HomeView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var memberships: [Membership] = []
    @State private var rewards: [RewardInstance] = []
    @State private var isLoading = true
    @State private var selectedMembership: Membership?

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
        rewards.filter { $0.status == "available" }
    }

    private var highlightedMembership: Membership? {
        // Closest to completing a reward
        memberships.first { m in
            guard let prog = m.program else { return false }
            return m.currentRounds > 0 && m.currentRounds < prog.roundsRequired
        } ?? memberships.first
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 24) {
                        // Greeting
                        VStack(alignment: .leading, spacing: 4) {
                            Text(greeting + (firstName.isEmpty ? "" : ", \(firstName)"))
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.primaryText)
                            Text("Here's your loyalty snapshot")
                                .font(.subheadline)
                                .foregroundColor(.secondaryText)
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 8)

                        if isLoading {
                            HStack { Spacer(); ProgressView().tint(.white); Spacer() }
                                .padding(.top, 40)
                        } else {
                            // Highlighted card
                            if let highlighted = highlightedMembership {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("YOUR TOP CARD")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundColor(.secondaryText)
                                        .padding(.horizontal, 20)
                                    MembershipCard(membership: highlighted, isHighlighted: true)
                                        .padding(.horizontal, 20)
                                        .onTapGesture { selectedMembership = highlighted }
                                }
                            }

                            // All memberships horizontal scroll
                            if !memberships.isEmpty {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("MY CARDS")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundColor(.secondaryText)
                                        .padding(.horizontal, 20)

                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 12) {
                                            ForEach(memberships) { m in
                                                MembershipCard(membership: m, isHighlighted: false)
                                                    .frame(width: 280)
                                                    .onTapGesture { selectedMembership = m }
                                            }
                                        }
                                        .padding(.horizontal, 20)
                                    }
                                }
                            }

                            // Ready to collect
                            if !availableRewards.isEmpty {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("READY TO COLLECT")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundColor(.secondaryText)
                                        .padding(.horizontal, 20)

                                    ForEach(availableRewards.prefix(3)) { reward in
                                        HomeRewardRow(reward: reward)
                                            .padding(.horizontal, 20)
                                    }
                                }
                            }

                            // Empty state
                            if memberships.isEmpty {
                                VStack(spacing: 16) {
                                    Image(systemName: "cup.and.saucer")
                                        .font(.system(size: 48))
                                        .foregroundColor(.secondaryText)
                                    Text("No memberships yet")
                                        .font(.headline)
                                        .foregroundColor(.primaryText)
                                    Text("Scan a store QR code to get started")
                                        .font(.subheadline)
                                        .foregroundColor(.secondaryText)
                                        .multilineTextAlignment(.center)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.top, 60)
                            }
                        }

                        Spacer(minLength: 100)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    RoundsLogoMark(size: 28, color: .white)
                }
            }
            .task { await loadData() }
            .refreshable { await loadData() }
            .sheet(item: $selectedMembership) { m in
                VendorDetailView(membership: m)
            }
        }
    }

    private func loadData() async {
        guard let userId = sessionManager.session?.user.id else { return }
        isLoading = true
        async let membershipsTask: [Membership] = (try? await supabase.database
            .from("customer_vendor_memberships")
            .select("*, vendors(*), loyalty_programs(*)")
            .eq("customer_id", value: userId)
            .eq("status", value: "active")
            .execute()
            .value) ?? []

        async let rewardsTask: [RewardInstance] = (try? await supabase.database
            .from("reward_instances")
            .select("*, vendors(id, business_name, brand_color), reward_collections(*)")
            .eq("customer_id", value: userId)
            .in("status", values: ["available"])
            .execute()
            .value) ?? []

        memberships = await membershipsTask
        rewards = await rewardsTask
        isLoading = false
    }
}

// MARK: - Membership Card

struct MembershipCard: View {
    let membership: Membership
    let isHighlighted: Bool

    private var accent: Color {
        Color.vendorAccent(membership.vendor?.brandColor)
    }

    private var required: Int {
        membership.program?.roundsRequired ?? 10
    }

    private var progress: Double {
        guard required > 0 else { return 0 }
        return min(Double(membership.currentRounds) / Double(required), 1.0)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Accent stripe
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [accent, accent.opacity(0.4)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .frame(height: 4)
                .cornerRadius(2)

            VStack(alignment: .leading, spacing: 12) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(membership.vendor?.businessName ?? "Store")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.primaryText)
                        if let cat = membership.vendor?.category {
                            Text(cat)
                                .font(.caption)
                                .foregroundColor(.secondaryText)
                        }
                    }
                    Spacer()
                    if let prog = membership.program,
                       membership.currentRounds >= prog.roundsRequired {
                        Text("REWARD READY")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(accent)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(accent.opacity(0.15))
                            .cornerRadius(8)
                    }
                }

                // Big rounds number
                HStack(alignment: .lastTextBaseline, spacing: 6) {
                    Text("\(membership.currentRounds)")
                        .font(.system(size: 56, weight: .bold, design: .rounded))
                        .foregroundColor(.primaryText)
                    VStack(alignment: .leading, spacing: 1) {
                        Text("ROUNDS")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.secondaryText)
                        Text("of \(required)")
                            .font(.system(size: 12))
                            .foregroundColor(.secondaryText)
                    }
                }

                // Progress bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color.white.opacity(0.12))
                            .frame(height: 6)
                        RoundedRectangle(cornerRadius: 3)
                            .fill(accent)
                            .frame(width: geo.size.width * progress, height: 6)
                    }
                }
                .frame(height: 6)

                // Reward name
                if let rewardName = membership.program?.rewardName {
                    Text(rewardName)
                        .font(.caption)
                        .foregroundColor(.secondaryText)
                }
            }
            .padding(16)
        }
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(isHighlighted ? 0.12 : 0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(isHighlighted ? accent.opacity(0.4) : Color.glassBorder, lineWidth: 1)
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - Home Reward Row

struct HomeRewardRow: View {
    let reward: RewardInstance

    private var accent: Color {
        Color.vendorAccent(reward.vendor?.brandColor)
    }

    var body: some View {
        HStack(spacing: 14) {
            Circle()
                .fill(accent.opacity(0.2))
                .frame(width: 44, height: 44)
                .overlay(
                    Image(systemName: "gift")
                        .font(.system(size: 18))
                        .foregroundColor(accent)
                )

            VStack(alignment: .leading, spacing: 3) {
                Text(reward.vendor?.businessName ?? "Store")
                    .font(.caption.weight(.semibold))
                    .foregroundColor(.secondaryText)
                Text(reward.rewardName)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.primaryText)
            }

            Spacer()

            Text("Collect")
                .font(.caption.weight(.semibold))
                .foregroundColor(accent)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(accent.opacity(0.15))
                .cornerRadius(10)
        }
        .padding(14)
        .darkGlassCard()
    }
}
