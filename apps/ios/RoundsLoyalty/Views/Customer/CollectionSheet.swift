import SwiftUI

struct CollectionSheet: View {
    /// Optional reward instance (Home / Rewards tabs). When absent we collect
    /// purely against the membership (Vendor detail "enough rounds" case).
    var reward: RewardInstance? = nil
    var preloadedMembership: Membership? = nil

    @Environment(\.dismiss) private var dismiss

    @State private var membership: Membership?
    @State private var note: String = ""
    @State private var isLoading = true
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var didSubmit = false

    private var accent: Color {
        Color.vendorAccent(reward?.vendor?.brandColor ?? membership?.vendor?.brandColor)
    }
    private var vendorName: String {
        reward?.vendor?.businessName ?? membership?.vendor?.businessName ?? "Store"
    }
    private var rewardName: String {
        membership?.program?.rewardName ?? reward?.rewardName ?? "Reward"
    }
    private var rewardDescription: String? {
        membership?.program?.rewardDescription ?? reward?.rewardDescription
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                content
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                        .foregroundColor(.secondaryText)
                }
            }
            .task { await resolveMembership() }
        }
    }

    // MARK: - Content states (never blank)

    @ViewBuilder
    private var content: some View {
        if isLoading {
            RoundsLoadingView(size: 48)
        } else if didSubmit {
            successState
        } else if membership == nil {
            unavailableState
        } else {
            requestState
        }
    }

    private var header: some View {
        VStack(spacing: 18) {
            ZStack {
                Circle()
                    .fill(accent.opacity(0.15))
                    .frame(width: 84, height: 84)
                Image(systemName: "gift.fill")
                    .font(.system(size: 38))
                    .foregroundColor(accent)
            }

            VStack(spacing: 6) {
                Text(vendorName)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.secondaryText)
                Text(rewardName)
                    .font(.title2.bold())
                    .foregroundColor(.primaryText)
                    .multilineTextAlignment(.center)
                if let desc = rewardDescription, !desc.isEmpty {
                    Text(desc)
                        .font(.subheadline)
                        .foregroundColor(.secondaryText)
                        .multilineTextAlignment(.center)
                }
            }
        }
    }

    private var requestState: some View {
        VStack(spacing: 24) {
            header

            VStack(alignment: .leading, spacing: 8) {
                Text("Optional note")
                    .font(.caption.weight(.semibold))
                    .foregroundColor(.secondaryText)
                TextField("e.g. oat milk", text: $note)
                    .foregroundColor(.primaryText)
                    .padding(14)
                    .background(Color.white.opacity(0.7))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.black.opacity(0.08), lineWidth: 1)
                    )
            }

            if let error = errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }

            Button {
                Task { await requestCollection() }
            } label: {
                Group {
                    if isSubmitting {
                        ProgressView().tint(.white)
                    } else {
                        Text("Request Collection").font(.headline)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(accent)
                .foregroundColor(.white)
                .cornerRadius(14)
            }
            .disabled(isSubmitting)

            Spacer()
        }
        .padding(24)
    }

    private var successState: some View {
        VStack(spacing: 20) {
            Spacer()
            ZStack {
                Circle().fill(accent).frame(width: 88, height: 88)
                Image(systemName: "checkmark")
                    .font(.system(size: 40, weight: .bold))
                    .foregroundColor(.white)
            }
            VStack(spacing: 8) {
                Text("Collection requested!")
                    .font(.title3.bold())
                    .foregroundColor(.primaryText)
                Text("Show the store your collection code from the Rewards tab.")
                    .font(.subheadline)
                    .foregroundColor(.secondaryText)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, 32)
            Spacer()
            Spacer()
        }
        .padding(24)
    }

    private var unavailableState: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "exclamationmark.circle")
                .font(.system(size: 44))
                .foregroundColor(.secondaryText)
            Text("Can't collect right now")
                .font(.headline)
                .foregroundColor(.primaryText)
            Text(errorMessage ?? "We couldn't find your membership for this store. Pull to refresh and try again.")
                .font(.subheadline)
                .foregroundColor(.secondaryText)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Spacer()
            Spacer()
        }
        .padding(24)
    }

    // MARK: - Data

    private func resolveMembership() async {
        // Use preloaded membership when it already carries a program
        if let m = preloadedMembership, m.program != nil {
            membership = m
            isLoading = false
            return
        }

        let userId: UUID
        do {
            userId = try await supabase.auth.session.user.id
        } catch {
            errorMessage = "You're not signed in."
            isLoading = false
            return
        }

        guard let vendorId = reward?.vendorId ?? preloadedMembership?.vendorId else {
            isLoading = false
            return
        }

        let results: [Membership] = (try? await supabase.database
            .from("customer_vendor_memberships")
            .select("*, vendors(*), loyalty_programs(*)")
            .eq("customer_id", value: userId)
            .eq("vendor_id", value: vendorId)
            .limit(1)
            .execute()
            .value) ?? []

        membership = results.first ?? preloadedMembership
        isLoading = false
    }

    private func requestCollection() async {
        guard let membership = membership else { return }
        isSubmitting = true
        errorMessage = nil
        do {
            struct Params: Encodable {
                let membership_id: UUID
                let note: String?
            }
            try await supabase.database
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
