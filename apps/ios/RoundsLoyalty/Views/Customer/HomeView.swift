import SwiftUI

struct HomeView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var memberships: [Membership] = []
    @State private var rewards: [RewardInstance] = []
    @State private var isLoading = true
    @State private var selectedMembership: Membership?
    @State private var selectedReward: RewardInstance?

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
                VStack(alignment: .leading, spacing: 24) {

                    // MARK: Top bar
                    HStack {
                        Text("ROUNDS")
                            .font(.system(size: 14, weight: .black, design: .default))
                            .kerning(3)
                            .foregroundColor(.white)
                        Spacer()
                        Button {
                            // notifications
                        } label: {
                            Image(systemName: "bell")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundColor(.white.opacity(0.85))
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)

                    // MARK: Greeting card
                    GreetingCard(
                        greeting: greeting,
                        firstName: firstName,
                        rewardCount: availableRewards.count
                    )
                    .padding(.horizontal, 20)

                    if isLoading {
                        HStack { Spacer(); ProgressView().tint(.white); Spacer() }
                            .padding(.top, 40)
                    } else {
                        // MARK: Your Rounds section
                        if !memberships.isEmpty {
                            Text("YOUR ROUNDS")
                                .font(.system(size: 11, weight: .semibold))
                                .kerning(1.5)
                                .foregroundColor(.white.opacity(0.55))
                                .padding(.horizontal, 20)

                            VendorCardGrid(
                                memberships: memberships,
                                onTap: { selectedMembership = $0 }
                            )
                        }

                        // MARK: Ready to Collect
                        if !availableRewards.isEmpty {
                            Text("READY TO COLLECT")
                                .font(.system(size: 11, weight: .semibold))
                                .kerning(1.5)
                                .foregroundColor(.white.opacity(0.55))
                                .padding(.horizontal, 20)

                            ForEach(availableRewards.prefix(3)) { reward in
                                ReadyToCollectCard(reward: reward)
                                    .padding(.horizontal, 20)
                                    .onTapGesture { selectedReward = reward }
                            }
                        }

                        // MARK: Empty state
                        if memberships.isEmpty {
                            VStack(spacing: 16) {
                                Image(systemName: "cup.and.saucer")
                                    .font(.system(size: 48))
                                    .foregroundColor(.white.opacity(0.3))
                                Text("No memberships yet")
                                    .font(.headline)
                                    .foregroundColor(.white)
                                Text("Scan a store QR code to get started")
                                    .font(.subheadline)
                                    .foregroundColor(.white.opacity(0.55))
                                    .multilineTextAlignment(.center)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.top, 60)
                        }
                    }

                    Spacer(minLength: 100)
                }
            }
            .background(Color(hex: "#0A0A0A").ignoresSafeArea())
            .navigationBarHidden(true)
            .task { await loadData() }
            .refreshable { await loadData() }
            .sheet(item: $selectedMembership) { m in
                VendorDetailView(membership: m)
            }
            .sheet(item: $selectedReward) { reward in
                if let membership = memberships.first(where: { $0.vendorId == reward.vendorId }),
                   let program = membership.program {
                    CollectionSheet(membership: membership, program: program)
                }
            }
        }
    }

    private func loadData() async {
        guard let userId = sessionManager.session?.user.id else { return }
        isLoading = true

        async let membershipsTask: [Membership] = (try? await supabase.database
            .from("customer_vendor_memberships")
            .select("*, vendors(id, business_name, brand_color, logo_url), loyalty_programs(id, name, rounds_required, reward_name, default_round_value)")
            .eq("customer_id", value: userId)
            .eq("status", value: "active")
            .execute()
            .value) ?? []

        async let rewardsTask: [RewardInstance] = (try? await supabase.database
            .from("reward_instances")
            .select("*, vendors(id, business_name)")
            .eq("customer_id", value: userId)
            .in("status", values: ["available", "collection_requested", "ready"])
            .execute()
            .value) ?? []

        memberships = await membershipsTask
        rewards = await rewardsTask
        isLoading = false
    }
}

// MARK: - Greeting Card

private struct GreetingCard: View {
    let greeting: String
    let firstName: String
    let rewardCount: Int

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            LinearGradient.cardGradient(index: 1)
                .cornerRadius(26)

            VStack(alignment: .leading, spacing: 6) {
                Text(greeting.uppercased())
                    .font(.system(size: 11, weight: .semibold))
                    .kerning(1.2)
                    .foregroundColor(.white.opacity(0.55))

                Text(firstName.isEmpty ? "Welcome back" : firstName)
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundColor(.white)

                if rewardCount > 0 {
                    Text("\(rewardCount) reward\(rewardCount == 1 ? "" : "s") ready →")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.white.opacity(0.2))
                        .cornerRadius(20)
                }
            }
            .padding(22)
        }
        .frame(maxWidth: .infinity, minHeight: 160, alignment: .bottomLeading)
        .shadow(color: .black.opacity(0.4), radius: 16, x: 0, y: 8)
    }
}

// MARK: - Vendor Card Grid

private struct VendorCardGrid: View {
    let memberships: [Membership]
    let onTap: (Membership) -> Void

    var body: some View {
        VStack(spacing: 12) {
            // Featured card — full width
            if let first = memberships.first {
                VendorCard(membership: first, index: 2, isFeatured: true)
                    .padding(.horizontal, 20)
                    .onTapGesture { onTap(first) }
            }

            // 2-column grid for the rest
            if memberships.count > 1 {
                let rest = Array(memberships.dropFirst())
                LazyVGrid(
                    columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)],
                    spacing: 12
                ) {
                    ForEach(Array(rest.enumerated()), id: \.element.id) { idx, m in
                        VendorCard(membership: m, index: idx + 3, isFeatured: false)
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
    let index: Int
    let isFeatured: Bool

    private var required: Int { membership.program?.roundsRequired ?? 10 }
    private var progress: Double {
        guard required > 0 else { return 0 }
        return min(Double(membership.currentRounds) / Double(required), 1.0)
    }
    private var remaining: Int { max(0, required - membership.currentRounds) }

    var body: some View {
        ZStack(alignment: .topLeading) {
            LinearGradient.cardGradient(index: index)
                .cornerRadius(26)

            VStack(alignment: .leading, spacing: 0) {
                // Top row: vendor name + reward ready badge
                HStack(alignment: .top) {
                    Text(membership.vendor?.businessName ?? "Store")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white.opacity(0.7))
                        .lineLimit(1)
                    Spacer()
                    if remaining == 0 && required > 0 {
                        Text("★")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color(hex: "#FFD700"))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color(hex: "#FFD700").opacity(0.2))
                            .cornerRadius(12)
                    }
                }

                Spacer()

                // Hero number
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(membership.currentRounds)")
                        .font(.system(size: isFeatured ? 72 : 64, weight: .heavy, design: .rounded))
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)

                    Text("ROUNDS")
                        .font(.system(size: 11, weight: .semibold))
                        .kerning(1.5)
                        .foregroundColor(.white.opacity(0.55))
                }

                Spacer()

                // Progress bar + label
                VStack(alignment: .leading, spacing: 6) {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color.white.opacity(0.3))
                                .frame(height: 4)
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color.white)
                                .frame(width: geo.size.width * progress, height: 4)
                        }
                    }
                    .frame(height: 4)

                    if remaining > 0, let rewardName = membership.program?.rewardName {
                        Text("\(remaining) more for \(rewardName)")
                            .font(.system(size: 11))
                            .foregroundColor(.white.opacity(0.7))
                            .lineLimit(1)
                    } else if let rewardName = membership.program?.rewardName {
                        Text("Collect: \(rewardName)")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white)
                            .lineLimit(1)
                    }
                }
            }
            .padding(18)
        }
        .frame(maxWidth: .infinity)
        .frame(height: isFeatured ? 200 : 160)
        .shadow(color: .black.opacity(0.35), radius: 14, x: 0, y: 6)
    }
}

// MARK: - Ready to Collect Card

private struct ReadyToCollectCard: View {
    let reward: RewardInstance

    var body: some View {
        ZStack(alignment: .topLeading) {
            LinearGradient.cardGradient(index: 0)
                .cornerRadius(26)

            VStack(alignment: .leading, spacing: 10) {
                Text("READY TO COLLECT")
                    .font(.system(size: 11, weight: .semibold))
                    .kerning(1.5)
                    .foregroundColor(.white.opacity(0.55))

                Text(reward.rewardName)
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(.white)

                if let vendorName = reward.vendor?.businessName {
                    Text(vendorName)
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.7))
                }

                HStack {
                    Spacer()
                    Text("Collect Now →")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 10)
                        .background(Color.white.opacity(0.2))
                        .cornerRadius(20)
                }
            }
            .padding(20)
        }
        .shadow(color: .black.opacity(0.35), radius: 14, x: 0, y: 6)
    }
}
