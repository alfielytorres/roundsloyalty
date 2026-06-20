import SwiftUI

struct RewardsView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var rewards: [RewardInstance] = []
    @State private var isLoading = true
    @State private var selectedReward: RewardInstance?

    private var available: [RewardInstance] {
        rewards.filter { $0.status == "available" }
    }

    private var inProgress: [RewardInstance] {
        rewards.filter { ["collection_requested", "ready"].contains($0.status) }
    }

    private var collected: [RewardInstance] {
        rewards.filter { $0.status == "collected" }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                if isLoading {
                    ProgressView().tint(.white)
                } else if rewards.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "gift")
                            .font(.system(size: 48))
                            .foregroundColor(.secondaryText)
                        Text("No rewards yet")
                            .font(.headline)
                            .foregroundColor(.primaryText)
                        Text("Keep earning rounds to unlock rewards")
                            .font(.subheadline)
                            .foregroundColor(.secondaryText)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                } else {
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 24) {
                            if !available.isEmpty {
                                RewardSection(title: "READY TO COLLECT", rewards: available) { r in
                                    selectedReward = r
                                }
                            }
                            if !inProgress.isEmpty {
                                RewardSection(title: "COLLECTION IN PROGRESS", rewards: inProgress) { _ in }
                            }
                            if !collected.isEmpty {
                                RewardSection(title: "COLLECTED", rewards: collected) { _ in }
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 16)
                        .padding(.bottom, 80)
                    }
                }
            }
            .navigationTitle("Rewards")
            .navigationBarTitleDisplayMode(.large)
            .task { await loadRewards() }
            .refreshable { await loadRewards() }
            .sheet(item: $selectedReward) { reward in
                RewardDetailSheet(reward: reward)
            }
        }
    }

    private func loadRewards() async {
        guard let userId = sessionManager.session?.user.id else { return }
        isLoading = true
        rewards = (try? await supabase.database
            .from("reward_instances")
            .select("*, vendors(id, business_name, brand_color, logo_url), reward_collections(*)")
            .eq("customer_id", value: userId)
            .not("status", operator: .in, value: ["expired", "cancelled"])
            .order("created_at", ascending: false)
            .execute()
            .value) ?? []
        isLoading = false
    }
}

struct RewardSection: View {
    let title: String
    let rewards: [RewardInstance]
    let onTap: (RewardInstance) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.secondaryText)

            ForEach(rewards) { reward in
                RewardCard(reward: reward)
                    .onTapGesture { onTap(reward) }
            }
        }
    }
}

struct RewardCard: View {
    let reward: RewardInstance

    private var accent: Color {
        Color.vendorAccent(reward.vendor?.brandColor)
    }

    private var statusLabel: String {
        switch reward.status {
        case "available": return "Tap to collect"
        case "collection_requested": return "Requested"
        case "ready": return "Ready at store"
        case "collected": return "Collected"
        default: return reward.status
        }
    }

    private var statusColor: Color {
        switch reward.status {
        case "available": return accent
        case "ready": return .green
        case "collected": return .secondaryText
        default: return .secondaryText
        }
    }

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(accent.opacity(0.15))
                    .frame(width: 48, height: 48)
                Image(systemName: reward.status == "collected" ? "checkmark.seal.fill" : "gift.fill")
                    .font(.system(size: 20))
                    .foregroundColor(accent)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(reward.vendor?.businessName ?? "Store")
                    .font(.caption.weight(.semibold))
                    .foregroundColor(.secondaryText)
                Text(reward.rewardName)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.primaryText)
                if let code = reward.collection?.collectionCode {
                    Text("Code: \(code)")
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundColor(accent)
                }
            }

            Spacer()

            Text(statusLabel)
                .font(.caption.weight(.semibold))
                .foregroundColor(statusColor)
        }
        .padding(16)
        .darkGlassCard()
    }
}

struct RewardDetailSheet: View {
    let reward: RewardInstance
    @Environment(\.dismiss) private var dismiss
    @State private var showCollectionSheet = false

    private var accent: Color {
        Color.vendorAccent(reward.vendor?.brandColor)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                VStack(spacing: 24) {
                    ZStack {
                        Circle()
                            .fill(accent.opacity(0.15))
                            .frame(width: 100, height: 100)
                        Image(systemName: "gift.fill")
                            .font(.system(size: 44))
                            .foregroundColor(accent)
                    }
                    .padding(.top, 20)

                    VStack(spacing: 8) {
                        Text(reward.vendor?.businessName ?? "Store")
                            .font(.subheadline)
                            .foregroundColor(.secondaryText)
                        Text(reward.rewardName)
                            .font(.title2.bold())
                            .foregroundColor(.primaryText)
                        if let desc = reward.rewardDescription {
                            Text(desc)
                                .font(.subheadline)
                                .foregroundColor(.secondaryText)
                                .multilineTextAlignment(.center)
                        }
                    }

                    if let collection = reward.collection {
                        VStack(spacing: 8) {
                            Text("COLLECTION CODE")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.secondaryText)
                            Text(collection.collectionCode)
                                .font(.system(size: 32, weight: .bold, design: .monospaced))
                                .foregroundColor(accent)
                            Text("Show this code to the store")
                                .font(.caption)
                                .foregroundColor(.secondaryText)
                        }
                        .padding(20)
                        .darkGlassCard()
                        .padding(.horizontal, 20)
                    } else if reward.status == "available" {
                        Button {
                            // Navigate to collection request
                            showCollectionSheet = true
                        } label: {
                            Text("Request Collection")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(accent)
                                .foregroundColor(.white)
                                .cornerRadius(14)
                        }
                        .padding(.horizontal, 20)
                    }

                    Spacer()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                        .foregroundColor(.secondaryText)
                }
            }
        }
    }
}
