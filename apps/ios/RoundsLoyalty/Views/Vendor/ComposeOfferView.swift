import SwiftUI

struct ComposeOfferView: View {
    let businessId: UUID?
    @Environment(\.dismiss) private var dismiss

    @State private var targetSegment = "all"
    @State private var title = ""
    @State private var body_ = ""
    @State private var isSending = false
    @State private var errorMessage: String?

    private let titleMaxLength = 80
    private let bodyMaxLength = 300

    let segments = [
        ("all", "All Customers"),
        ("top", "Top Customers"),
        ("returning", "Returning"),
        ("at_risk", "At Risk")
    ]

    var body: some View {
        NavigationStack {
            ZStack {
                Color.brandCream.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        // Segment picker
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Target Audience")
                                .font(.caption.weight(.semibold))
                                .foregroundColor(.brandDarkGreen)
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(segments, id: \.0) { segment in
                                        FilterPill(label: segment.1, isSelected: targetSegment == segment.0) {
                                            targetSegment = segment.0
                                        }
                                    }
                                }
                            }
                        }

                        // Title
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("Title")
                                    .font(.caption.weight(.semibold))
                                    .foregroundColor(.brandDarkGreen)
                                Spacer()
                                Text("\(title.count)/\(titleMaxLength)")
                                    .font(.caption2)
                                    .foregroundColor(title.count > titleMaxLength ? .red : .brandTaupe)
                            }
                            TextField("e.g. Free coffee Friday!", text: $title)
                                .onChange(of: title) { _ in
                                    if title.count > titleMaxLength {
                                        title = String(title.prefix(titleMaxLength))
                                    }
                                }
                                .padding()
                                .background(Color.white)
                                .cornerRadius(12)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.brandTaupe, lineWidth: 1))
                        }

                        // Body
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("Message")
                                    .font(.caption.weight(.semibold))
                                    .foregroundColor(.brandDarkGreen)
                                Spacer()
                                Text("\(body_.count)/\(bodyMaxLength)")
                                    .font(.caption2)
                                    .foregroundColor(body_.count > bodyMaxLength ? .red : .brandTaupe)
                            }
                            TextEditor(text: $body_)
                                .frame(minHeight: 100)
                                .padding(8)
                                .background(Color.white)
                                .cornerRadius(12)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.brandTaupe, lineWidth: 1))
                                .onChange(of: body_) { _ in
                                    if body_.count > bodyMaxLength {
                                        body_ = String(body_.prefix(bodyMaxLength))
                                    }
                                }
                        }

                        // Preview card
                        if !title.isEmpty || !body_.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Preview")
                                    .font(.caption.weight(.semibold))
                                    .foregroundColor(.brandDarkGreen)

                                VStack(alignment: .leading, spacing: 6) {
                                    HStack {
                                        Image(systemName: "tag.fill")
                                            .foregroundColor(.brandGreen)
                                        Text("Your Store")
                                            .font(.caption.weight(.semibold))
                                            .foregroundColor(.brandTaupe)
                                    }
                                    if !title.isEmpty {
                                        Text(title)
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundColor(.brandDarkGreen)
                                    }
                                    if !body_.isEmpty {
                                        Text(body_)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                .padding()
                                .background(Color.white)
                                .cornerRadius(12)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.brandLightGreen, lineWidth: 1))
                            }
                        }

                        if let errorMessage {
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundColor(.red)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        Button {
                            Task { await sendOffer() }
                        } label: {
                            HStack {
                                if isSending {
                                    ProgressView().tint(.white)
                                } else {
                                    Label("Send Offer", systemImage: "paperplane.fill")
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(canSend ? Color.brandGreen : Color.brandTaupe)
                            .foregroundColor(.white)
                            .font(.headline)
                            .cornerRadius(14)
                        }
                        .disabled(!canSend)
                    }
                    .padding()
                }
            }
            .navigationTitle("New Offer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.brandGreen)
                }
            }
        }
    }

    private var canSend: Bool {
        !isSending && !title.isEmpty && !body_.isEmpty && businessId != nil
    }

    private func sendOffer() async {
        guard let businessId else { return }
        isSending = true
        errorMessage = nil
        do {
            // Insert offer
            struct InsertedOffer: Codable { let id: UUID }
            let inserted: InsertedOffer = try await supabase
                .from("offers")
                .insert([
                    "business_id": businessId.uuidString,
                    "title": title,
                    "body": body_,
                    "target_segment": targetSegment
                ])
                .select()
                .single()
                .execute()
                .value

            // Fan out via edge function
            try await supabase.functions.invoke(
                "send-offer",
                options: .init(body: ["offer_id": AnyJSON(inserted.id.uuidString)])
            )

            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSending = false
    }
}
