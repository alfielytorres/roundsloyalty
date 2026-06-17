import SwiftUI

struct CardsView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var cards: [LoyaltyCard] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.brandCream.ignoresSafeArea()

                if isLoading {
                    ProgressView()
                        .tint(.brandGreen)
                } else if cards.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "creditcard")
                            .font(.system(size: 48))
                            .foregroundColor(.brandTaupe)
                        Text("No loyalty cards yet")
                            .font(.headline)
                            .foregroundColor(.brandDarkGreen)
                        Text("Scan a store's QR code to get started")
                            .font(.subheadline)
                            .foregroundColor(.brandTaupe)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(cards) { card in
                                LoyaltyCardRow(card: card)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("My Cards")
            .navigationBarTitleDisplayMode(.large)
            .task { await loadCards() }
            .refreshable { await loadCards() }
        }
    }

    private func loadCards() async {
        guard let userId = sessionManager.session?.user.id else { return }
        isLoading = true
        do {
            let fetched: [LoyaltyCard] = try await supabase
                .from("loyalty_cards")
                .select("*, loyalty_programs(*, businesses(*))")
                .eq("customer_id", value: userId)
                .order("last_visit", ascending: false)
                .execute()
                .value
            cards = fetched
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

struct LoyaltyCardRow: View {
    let card: LoyaltyCard

    var business: Business? { card.loyaltyProgram?.business }
    var program: LoyaltyProgramWithBusiness? { card.loyaltyProgram }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(business?.name ?? "Unknown Business")
                        .font(.headline)
                        .foregroundColor(.brandDarkGreen)
                    if let reward = program?.rewardDescription {
                        Text(reward)
                            .font(.caption)
                            .foregroundColor(.brandTaupe)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundColor(.brandTaupe)
            }

            if program?.type == .stamp, let config = program?.config, let required = config.stampsRequired {
                StampGrid(collected: card.stampsCollected, required: required)
            } else if program?.type == .points {
                HStack {
                    Image(systemName: "star.fill")
                        .foregroundColor(.brandGreen)
                    Text("\(card.pointsAccumulated) points")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.brandDarkGreen)
                }
            }

            if let lastVisit = card.lastVisit {
                Text("Last visit: \(lastVisit.formatted(.relative(presentation: .named)))")
                    .font(.caption2)
                    .foregroundColor(.brandTaupe)
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
                    .overlay(
                        Circle()
                            .stroke(Color.brandGreen.opacity(index < collected ? 0 : 0.3), lineWidth: 1)
                    )
                    .overlay(
                        Image(systemName: index < collected ? "checkmark" : "")
                            .font(.caption2.weight(.bold))
                            .foregroundColor(.white)
                    )
            }
        }
    }
}
