import SwiftUI

struct VendorOffersView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var business: Business?
    @State private var offers: [OfferWithCount] = []
    @State private var isLoading = true
    @State private var showCompose = false

    struct OfferWithCount: Codable, Identifiable {
        let id: UUID
        let businessId: UUID
        let title: String
        let body: String
        let targetSegment: String
        let createdAt: Date
        let offerRecipients: [RecipientCount]

        var recipientCount: Int { offerRecipients.first?.count ?? 0 }

        struct RecipientCount: Codable { let count: Int }

        enum CodingKeys: String, CodingKey {
            case id; case businessId = "business_id"; case title; case body
            case targetSegment = "target_segment"; case createdAt = "created_at"
            case offerRecipients = "offer_recipients"
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.brandCream.ignoresSafeArea()

                if isLoading {
                    ProgressView().tint(.brandGreen)
                } else if offers.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "megaphone")
                            .font(.system(size: 48))
                            .foregroundColor(.brandTaupe)
                        Text("No offers sent yet")
                            .font(.headline)
                            .foregroundColor(.brandDarkGreen)
                        Text("Create your first offer to engage customers")
                            .font(.subheadline)
                            .foregroundColor(.brandTaupe)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                } else {
                    List(offers) { offer in
                        VendorOfferRow(offer: offer)
                            .listRowBackground(Color.white.opacity(0.7))
                            .listRowSeparatorTint(Color.brandGreen.opacity(0.1))
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Offers")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { showCompose = true } label: {
                        Image(systemName: "plus").foregroundColor(.brandGreen)
                    }
                }
            }
            .task { await loadOffers() }
            .refreshable { await loadOffers() }
            .sheet(isPresented: $showCompose) {
                ComposeOfferView(businessId: business?.id)
                    .onDisappear { Task { await loadOffers() } }
            }
        }
    }

    private func loadOffers() async {
        guard let userId = sessionManager.session?.user.id else { return }
        isLoading = true
        do {
            let biz: Business? = try await supabase
                .from("businesses")
                .select("id")
                .eq("owner_id", value: userId)
                .maybeSingle()
                .execute()
                .value
            business = biz

            guard let bizId = biz?.id else { isLoading = false; return }

            let fetched: [OfferWithCount] = try await supabase
                .from("offers")
                .select("*, offer_recipients(count)")
                .eq("business_id", value: bizId)
                .order("created_at", ascending: false)
                .execute()
                .value
            offers = fetched
        } catch {
            print("Failed to load offers: \(error)")
        }
        isLoading = false
    }
}

struct VendorOfferRow: View {
    let offer: VendorOffersView.OfferWithCount

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(segmentLabel)
                    .font(.caption2.weight(.semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(segmentColor.opacity(0.15))
                    .foregroundColor(segmentColor)
                    .cornerRadius(6)
                Spacer()
                Text(offer.createdAt.formatted(.relative(presentation: .named)))
                    .font(.caption2)
                    .foregroundColor(.brandTaupe)
            }
            Text(offer.title)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(.brandDarkGreen)
            Text(offer.body)
                .font(.caption)
                .foregroundColor(.brandTaupe)
                .lineLimit(2)
            HStack {
                Image(systemName: "person.2").font(.caption2)
                Text("\(offer.recipientCount) recipients").font(.caption2)
            }
            .foregroundColor(.brandTaupe)
        }
        .padding(.vertical, 6)
    }

    private var segmentLabel: String {
        switch offer.targetSegment {
        case "all": return "All Customers"
        case "top": return "Top Customers"
        case "returning": return "Returning"
        case "at_risk": return "At Risk"
        default: return offer.targetSegment
        }
    }

    private var segmentColor: Color {
        switch offer.targetSegment {
        case "top": return .brandGreen
        case "returning": return .blue
        case "at_risk": return .orange
        default: return .brandTaupe
        }
    }
}
