import SwiftUI

struct RoundTransaction: Identifiable, Decodable {
    let id: UUID
    let roundsAwarded: Int
    let createdAt: Date
    enum CodingKeys: String, CodingKey {
        case id
        case roundsAwarded = "rounds_awarded"
        case createdAt = "created_at"
    }
}

struct VendorDetailView: View {
    let membership: Membership
    @Environment(\.dismiss) private var dismiss
    @State private var showCollection = false
    @State private var availableReward: RewardInstance?
    @State private var recentStamps: [RoundTransaction] = []

    private var accent: Color {
        Color.vendorAccent(membership.vendor?.brandColor)
    }

    /// Stable gradient index based on vendor ID so each vendor gets a consistent card colour.
    private var gradientIndex: Int {
        abs(membership.vendorId.hashValue) % 5
    }

    private var required: Int {
        membership.program?.roundsRequired ?? 10
    }

    private var progress: Double {
        guard required > 0 else { return 0 }
        return min(Double(membership.currentRounds) / Double(required), 1.0)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        // Hero header
                        ZStack(alignment: .bottomLeading) {
                            LinearGradient.cardGradient(index: gradientIndex)
                                .frame(height: 220)

                            VStack(alignment: .leading, spacing: 6) {
                                if let logoUrl = membership.vendor?.logoUrl, let url = URL(string: logoUrl) {
                                    AsyncImage(url: url) { img in
                                        img.resizable().scaledToFill()
                                    } placeholder: { Color.black.opacity(0.06) }
                                        .frame(width: 48, height: 48)
                                        .clipShape(RoundedRectangle(cornerRadius: 12))
                                        .shadow(color: .black.opacity(0.10), radius: 4, x: 0, y: 2)
                                }
                                Text(membership.vendor?.businessName ?? "Store")
                                    .font(.system(size: 28, weight: .bold))
                                    .foregroundColor(.primaryText)
                                if let cat = membership.vendor?.category {
                                    Text(cat)
                                        .font(.subheadline)
                                        .foregroundColor(.secondaryText)
                                }
                                if let address = membership.vendor?.address {
                                    Label(address, systemImage: "mappin")
                                        .font(.caption)
                                        .foregroundColor(.secondaryText)
                                }
                            }
                            .padding(20)
                        }

                        VStack(spacing: 20) {
                            // Progress card
                            VStack(spacing: 16) {
                                HStack(alignment: .lastTextBaseline, spacing: 8) {
                                    Text("\(membership.currentRounds)")
                                        .font(.system(size: 72, weight: .bold, design: .rounded))
                                        .foregroundColor(.primaryText)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("ROUNDS")
                                            .font(.system(size: 12, weight: .bold))
                                            .foregroundColor(.secondaryText)
                                        Text("of \(required)")
                                            .font(.system(size: 14))
                                            .foregroundColor(.secondaryText)
                                    }
                                    Spacer()
                                }

                                // Progress bar
                                GeometryReader { geo in
                                    ZStack(alignment: .leading) {
                                        RoundedRectangle(cornerRadius: 4)
                                            .fill(Color.white.opacity(0.12))
                                            .frame(height: 8)
                                        RoundedRectangle(cornerRadius: 4)
                                            .fill(
                                                LinearGradient(
                                                    colors: [accent, accent.opacity(0.7)],
                                                    startPoint: .leading,
                                                    endPoint: .trailing
                                                )
                                            )
                                            .frame(width: geo.size.width * progress, height: 8)
                                            .animation(.spring(response: 0.5), value: progress)
                                    }
                                }
                                .frame(height: 8)

                                if let prog = membership.program {
                                    HStack {
                                        Text(prog.rewardName)
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundColor(.primaryText)
                                        Spacer()
                                        let remaining = max(0, prog.roundsRequired - membership.currentRounds)
                                        if remaining == 0 {
                                            Text("Ready to collect!")
                                                .font(.caption.weight(.bold))
                                                .foregroundColor(accent)
                                        } else {
                                            Text("\(remaining) more to go")
                                                .font(.caption)
                                                .foregroundColor(.secondaryText)
                                        }
                                    }
                                }
                            }
                            .padding(20)
                            .darkGlassCard()

                            // Lifetime stats
                            HStack(spacing: 12) {
                                StatTile(label: "LIFETIME", value: "\(membership.lifetimeRounds)", accent: accent)
                                StatTile(label: "MEMBER SINCE",
                                         value: membership.activatedAt.map {
                                             $0.formatted(.dateTime.month(.abbreviated).year())
                                         } ?? "–",
                                         accent: accent)
                            }

                            // Collect button
                            if let prog = membership.program,
                               membership.currentRounds >= prog.roundsRequired {
                                Button {
                                    showCollection = true
                                } label: {
                                    HStack {
                                        Image(systemName: "gift")
                                        Text("Request Collection")
                                            .font(.headline)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(accent)
                                    .foregroundColor(.white)
                                    .cornerRadius(14)
                                }
                            }

                            // Vendor description
                            if let desc = membership.vendor?.description {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("ABOUT")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundColor(.secondaryText)
                                    Text(desc)
                                        .font(.subheadline)
                                        .foregroundColor(.primaryText)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(16)
                                .darkGlassCard()
                            }

                            // Recent stamps
                            VStack(alignment: .leading, spacing: 10) {
                                Text("RECENT ACTIVITY")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundColor(.secondaryText)
                                if recentStamps.isEmpty {
                                    Text("No stamps yet")
                                        .font(.subheadline)
                                        .foregroundColor(.secondaryText)
                                        .padding(.top, 4)
                                } else {
                                    ForEach(recentStamps) { tx in
                                        HStack {
                                            Image(systemName: "seal.fill")
                                                .font(.system(size: 13))
                                                .foregroundColor(accent)
                                            Text("+\(tx.roundsAwarded) round\(tx.roundsAwarded == 1 ? "" : "s")")
                                                .font(.system(size: 14, weight: .semibold))
                                                .foregroundColor(.primaryText)
                                            Spacer()
                                            Text(tx.createdAt.relativeLabel)
                                                .font(.system(size: 12))
                                                .foregroundColor(.secondaryText)
                                        }
                                        .padding(.vertical, 2)
                                    }
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(16)
                            .darkGlassCard()
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 16)
                        .padding(.bottom, 60)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .foregroundColor(.primaryText)
                    }
                }
            }
        }
        .sheet(isPresented: $showCollection) {
            if let prog = membership.program {
                CollectionSheet(
                    membership: membership,
                    program: prog
                )
            }
        }
        .task {
            await loadAvailableReward()
        }
    }

    private func loadAvailableReward() async {
        async let rewardTask: [RewardInstance] = (try? await supabase.database
            .from("reward_instances")
            .select("*, vendors(*), reward_collections(*)")
            .eq("vendor_id", value: membership.vendorId)
            .eq("customer_id", value: membership.customerId)
            .eq("status", value: "available")
            .limit(1)
            .execute()
            .value) ?? []
        async let stampsTask: [RoundTransaction] = (try? await supabase.database
            .from("round_transactions")
            .select("id, rounds_awarded, created_at")
            .eq("membership_id", value: membership.id)
            .order("created_at", ascending: false)
            .limit(10)
            .execute()
            .value) ?? []
        availableReward = await rewardTask.first
        recentStamps = await stampsTask
    }
}

private extension Date {
    var relativeLabel: String {
        let diff = Date().timeIntervalSince(self)
        if diff < 60 { return "just now" }
        if diff < 3600 { return "\(Int(diff / 60))m ago" }
        if diff < 86400 { return "\(Int(diff / 3600))h ago" }
        let days = Int(diff / 86400)
        return days == 1 ? "Yesterday" : "\(days)d ago"
    }
}

struct StatTile: View {
    let label: String
    let value: String
    let accent: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(.secondaryText)
            Text(value)
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .foregroundColor(.primaryText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .darkGlassCard()
    }
}
