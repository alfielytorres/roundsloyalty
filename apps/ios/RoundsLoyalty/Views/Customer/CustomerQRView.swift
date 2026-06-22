import SwiftUI
import CoreImage.CIFilterBuiltins

struct CustomerQRView: View {
    @EnvironmentObject var sessionManager: SessionManager

    /// Optional NFC tap-to-stamp action; nil hides the button (e.g. unsupported device).
    var onNFCStamp: (() -> Void)? = nil

    /// Prefer customer_token from profile, fall back to user UUID
    private var qrValue: String? {
        sessionManager.profile?.customerToken ?? sessionManager.session?.user.id.uuidString
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                VStack(spacing: 24) {
                    Text("My Customer Code")
                        .font(.title2.bold())
                        .foregroundColor(.primaryText)

                    Text("Show this to the store to earn rounds")
                        .font(.subheadline)
                        .foregroundColor(.secondaryText)
                        .multilineTextAlignment(.center)

                    if let value = qrValue, let qrImage = generateQR(from: value) {
                        Image(uiImage: qrImage)
                            .interpolation(.none)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 240, height: 240)
                            .padding(20)
                            .background(Color.white)
                            .cornerRadius(20)
                            .shadow(color: .black.opacity(0.4), radius: 12, x: 0, y: 4)

                        Text(value)
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(.secondaryText)
                            .lineLimit(2)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                    } else {
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.glassCard)
                            .frame(width: 240, height: 240)
                            .overlay(
                                Text("Sign in to view QR")
                                    .foregroundColor(.secondaryText)
                            )
                    }

                    if let onNFCStamp {
                        Button(action: onNFCStamp) {
                            HStack(spacing: 10) {
                                Image(systemName: "wave.3.right")
                                    .font(.system(size: 18, weight: .semibold))
                                Text("Tap to stamp with NFC")
                                    .font(.system(size: 16, weight: .semibold))
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.accentDefault)
                            .cornerRadius(16)
                        }
                        .padding(.horizontal, 8)

                        Text("Hold your phone to the store's tag")
                            .font(.caption)
                            .foregroundColor(.secondaryText)
                    }

                    Spacer()
                }
                .padding(.top, 32)
                .padding(.horizontal, 24)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func generateQR(from string: String) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage else { return nil }
        let scaled = output.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
        guard let cgImage = context.createCGImage(scaled, from: scaled.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}
