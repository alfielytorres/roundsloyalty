import SwiftUI

struct NFCReceiveView: View {
    let result: AwardResult
    let vendor: Vendor?
    var onDismiss: () -> Void

    @State private var visibleRounds: Int = 0
    @State private var showProgress = false
    @State private var showReward = false

    private var accent: Color {
        Color.vendorAccent(vendor?.brandColor)
    }

    private var isCampaign: Bool {
        result.campaignId != nil
    }

    private var rewardUnlocked: Bool {
        result.rewardsUnlocked > 0
    }

    var body: some View {
        ZStack {
            // Background
            LinearGradient(
                colors: [accent.opacity(0.35), Color.appBackground],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

                // Vendor name
                if let vendor = vendor {
                    Text(vendor.businessName.uppercased())
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundColor(.secondaryText)
                        .tracking(2)
                }

                // Rounds animation
                VStack(spacing: 8) {
                    HStack(alignment: .lastTextBaseline, spacing: 4) {
                        Text("+\(result.roundsAwarded)")
                            .font(.system(size: 80, weight: .black, design: .rounded))
                            .foregroundColor(.primaryText)
                            .contentTransition(.numericText(countsDown: false))
                    }
                    Text("ROUNDS ADDED")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.secondaryText)
                        .tracking(2)
                }

                // Campaign badge
                if isCampaign {
                    HStack(spacing: 6) {
                        Image(systemName: "bolt.fill")
                        Text((result.campaignName ?? "DOUBLE ROUND").uppercased())
                            .font(.system(size: 12, weight: .bold))
                    }
                    .foregroundColor(.black)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.yellow)
                    .cornerRadius(20)
                }

                // Progress
                if showProgress {
                    VStack(spacing: 6) {
                        let required = result.vendor?.roundsRequired.map { String($0) } ?? "?"
                        Text("\(result.balance.currentRounds) / \(required) ROUNDS")
                            .font(.system(size: 20, weight: .semibold, design: .rounded))
                            .foregroundColor(.primaryText)
                            .transition(.opacity.combined(with: .scale))
                    }
                }

                // Reward unlocked
                if rewardUnlocked && showReward {
                    VStack(spacing: 12) {
                        Image(systemName: "gift.fill")
                            .font(.system(size: 40))
                            .foregroundColor(accent)
                        Text("REWARD READY")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.primaryText)
                        if let vendor = vendor {
                            Text("Collect your reward at \(vendor.businessName)")
                                .font(.subheadline)
                                .foregroundColor(.secondaryText)
                                .multilineTextAlignment(.center)
                        }
                    }
                    .padding(24)
                    .darkGlassCard()
                    .padding(.horizontal, 32)
                    .transition(.opacity.combined(with: .scale))
                }

                Spacer()

                // Dismiss
                Button("Tap to dismiss") {
                    onDismiss()
                }
                .font(.subheadline)
                .foregroundColor(.secondaryText)
                .padding(.bottom, 40)
            }
        }
        .onTapGesture { onDismiss() }
        .onAppear {
            // Animate progress bar after short delay
            withAnimation(.spring(response: 0.6).delay(0.4)) {
                showProgress = true
            }
            // Show reward unlock if applicable
            if rewardUnlocked {
                withAnimation(.spring(response: 0.5).delay(1.0)) {
                    showReward = true
                }
            }
            // Auto-dismiss after 4 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
                onDismiss()
            }
        }
    }
}
