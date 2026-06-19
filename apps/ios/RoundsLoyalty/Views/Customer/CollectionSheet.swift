import SwiftUI

struct CollectionSheet: View {
    let membership: Membership
    let program: LoyaltyProgram
    @Environment(\.dismiss) private var dismiss

    @State private var note: String = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var didSubmit = false

    private var accent: Color {
        Color.vendorAccent(membership.vendor?.brandColor)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                VStack(spacing: 24) {
                    // Icon
                    ZStack {
                        Circle()
                            .fill(accent.opacity(0.15))
                            .frame(width: 80, height: 80)
                        Image(systemName: "gift.fill")
                            .font(.system(size: 36))
                            .foregroundColor(accent)
                    }

                    VStack(spacing: 8) {
                        Text("Collect your reward")
                            .font(.title2.bold())
                            .foregroundColor(.primaryText)
                        Text(program.rewardName)
                            .font(.headline)
                            .foregroundColor(accent)
                        if let desc = program.rewardDescription {
                            Text(desc)
                                .font(.subheadline)
                                .foregroundColor(.secondaryText)
                                .multilineTextAlignment(.center)
                        }
                    }

                    // Note field
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Optional note")
                            .font(.caption.weight(.semibold))
                            .foregroundColor(.secondaryText)
                        TextField("e.g. lactose-free milk", text: $note)
                            .foregroundColor(.primaryText)
                            .padding(12)
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(10)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(Color.glassBorder, lineWidth: 1)
                            )
                    }

                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                    }

                    if didSubmit {
                        VStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 40))
                                .foregroundColor(accent)
                            Text("Collection requested!")
                                .font(.headline)
                                .foregroundColor(.primaryText)
                            Text("Show the store your collection code from Rewards")
                                .font(.subheadline)
                                .foregroundColor(.secondaryText)
                                .multilineTextAlignment(.center)
                        }
                    } else {
                        Button {
                            Task { await requestCollection() }
                        } label: {
                            Group {
                                if isSubmitting {
                                    ProgressView().tint(.white)
                                } else {
                                    Text("Request Collection")
                                        .font(.headline)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(accent)
                            .foregroundColor(.white)
                            .cornerRadius(14)
                        }
                        .disabled(isSubmitting)
                    }

                    Spacer()
                }
                .padding(24)
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

    private func requestCollection() async {
        isSubmitting = true
        errorMessage = nil
        do {
            struct Params: Encodable {
                let membership_id: UUID
                let note: String?
            }
            try await supabase
                .rpc("request_reward_collection", params: Params(
                    membership_id: membership.id,
                    note: note.isEmpty ? nil : note
                ))
                .execute()
            withAnimation { didSubmit = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { dismiss() }
        } catch {
            errorMessage = error.localizedDescription
        }
        isSubmitting = false
    }
}
