import SwiftUI

struct OffersView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var recipients: [OfferRecipient] = []
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            ZStack {
                Color.brandCream.ignoresSafeArea()

                if isLoading {
                    ProgressView().tint(.brandGreen)
                } else if recipients.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "bell.slash")
                            .font(.system(size: 48))
                            .foregroundColor(.brandTaupe)
                        Text("No offers yet")
                            .font(.headline)
                            .foregroundColor(.brandDarkGreen)
                        Text("Offers from your favourite stores will appear here")
                            .font(.subheadline)
                            .foregroundColor(.brandTaupe)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                } else {
                    List {
                        ForEach(recipients) { recipient in
                            OfferRow(recipient: recipient)
                                .listRowBackground(recipient.openedAt == nil ? Color.brandGreen.opacity(0.08) : Color.white.opacity(0.7))
                                .onTapGesture {
                                    if recipient.openedAt == nil {
                                        Task { await markOpened(recipient: recipient) }
                                    }
                                }
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Offers")
            .task { await loadOffers() }
            .refreshable { await loadOffers() }
        }
    }

    private func loadOffers() async {
        guard let userId = sessionManager.session?.user.id else { return }
        do {
            let fetched: [OfferRecipient] = try await supabase
                .from("offer_recipients")
                .select("id, offer_id, delivered_at, opened_at, offers(id, title, body, created_at, businesses(name, logo_url))")
                .eq("customer_id", value: userId)
                .order("delivered_at", ascending: false)
                .execute()
                .value
            recipients = fetched
        } catch {
            print("Failed to load offers: \(error)")
        }
        isLoading = false
    }

    private func markOpened(recipient: OfferRecipient) async {
        do {
            try await supabase
                .from("offer_recipients")
                .update(["opened_at": Date().ISO8601Format()])
                .eq("id", value: recipient.id)
                .is("opened_at", value: "null")
                .execute()
            if let idx = recipients.firstIndex(where: { $0.id == recipient.id }) {
                recipients[idx] = OfferRecipient(
                    id: recipient.id,
                    offerId: recipient.offerId,
                    deliveredAt: recipient.deliveredAt,
                    openedAt: Date(),
                    offer: recipient.offer
                )
            }
        } catch {
            print("Failed to mark offer opened: \(error)")
        }
    }
}

struct OfferRow: View {
    let recipient: OfferRecipient

    var isUnread: Bool { recipient.openedAt == nil }
    var offer: OfferWithBusiness? { recipient.offer }

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.brandGreen.opacity(0.2))
                    .frame(width: 44, height: 44)
                Image(systemName: "tag.fill")
                    .foregroundColor(.brandGreen)
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(offer?.business?.name ?? "A store")
                        .font(.caption.weight(.semibold))
                        .foregroundColor(.brandTaupe)
                    Spacer()
                    if let delivered = recipient.deliveredAt {
                        Text(delivered.formatted(.relative(presentation: .named)))
                            .font(.caption2)
                            .foregroundColor(.brandTaupe)
                    }
                }
                Text(offer?.title ?? "")
                    .font(.subheadline.weight(isUnread ? .semibold : .regular))
                    .foregroundColor(.brandDarkGreen)
                    .lineLimit(1)
                Text(offer?.body ?? "")
                    .font(.caption)
                    .foregroundColor(.brandTaupe)
                    .lineLimit(2)
            }

            if isUnread {
                Circle()
                    .fill(Color.brandGreen)
                    .frame(width: 8, height: 8)
            }
        }
        .padding(.vertical, 4)
    }
}
