import SwiftUI
import CoreImage
import CoreImage.CIFilterBuiltins

struct QRView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var business: Business?
    @State private var qrImage: UIImage?
    @State private var isLoading = true
    @State private var secondsRemaining: Int = 240
    @State private var timer: Timer?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.brandCream.ignoresSafeArea()

                if isLoading {
                    ProgressView().tint(.brandGreen)
                } else if let business = business {
                    VStack(spacing: 32) {
                        VStack(spacing: 8) {
                            Text(business.name)
                                .font(.title2.bold())
                                .foregroundColor(.brandDarkGreen)
                            Text("Show this QR code to earn stamps")
                                .font(.subheadline)
                                .foregroundColor(.brandTaupe)
                        }

                        if let qrImage {
                            Image(uiImage: qrImage)
                                .interpolation(.none)
                                .resizable()
                                .scaledToFit()
                                .frame(width: 260, height: 260)
                                .padding(20)
                                .background(Color.white)
                                .cornerRadius(20)
                        } else {
                            RoundedRectangle(cornerRadius: 20)
                                .fill(Color.white.opacity(0.7))
                                .frame(width: 260, height: 260)
                                .overlay(ProgressView().tint(.brandGreen))
                        }

                        VStack(spacing: 8) {
                            Text("Refreshes in \(timeString)")
                                .font(.subheadline)
                                .foregroundColor(.brandTaupe)
                            ZStack {
                                Circle().stroke(Color.brandLightGreen, lineWidth: 4)
                                Circle()
                                    .trim(from: 0, to: CGFloat(secondsRemaining) / 240)
                                    .stroke(Color.brandGreen, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                                    .rotationEffect(.degrees(-90))
                                    .animation(.linear(duration: 1), value: secondsRemaining)
                            }
                            .frame(width: 48, height: 48)
                        }

                        Button { refreshQR() } label: {
                            Label("Refresh Now", systemImage: "arrow.clockwise")
                                .font(.subheadline.weight(.semibold))
                                .foregroundColor(.brandDarkGreen)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 10)
                                .glassCard(cornerRadius: 20)
                        }
                    }
                    .padding()
                } else {
                    VStack(spacing: 16) {
                        Image(systemName: "qrcode")
                            .font(.system(size: 56))
                            .foregroundColor(.brandTaupe)
                        Text("Set up your store first")
                            .font(.headline)
                            .foregroundColor(.brandDarkGreen)
                        Text("Add your business details in Settings")
                            .font(.subheadline)
                            .foregroundColor(.brandTaupe)
                    }
                }
            }
            .navigationTitle("My QR Code")
            .navigationBarTitleDisplayMode(.inline)
            .task { await loadBusiness(); startTimer() }
            .onDisappear { timer?.invalidate() }
        }
    }

    private var timeString: String {
        let minutes = secondsRemaining / 60
        let seconds = secondsRemaining % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    private func startTimer() {
        timer?.invalidate()
        secondsRemaining = 240
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if secondsRemaining > 0 { secondsRemaining -= 1 } else { refreshQR() }
        }
    }

    private func refreshQR() {
        guard let business = business, let secret = business.qrCodeSecret else { return }
        let payload = generateQRPayload(businessId: business.id, secret: secret)
        qrImage = generateQRCode(from: payload)
        startTimer()
    }

    private func loadBusiness() async {
        guard let userId = sessionManager.session?.user.id else { return }
        do {
            let biz: Business? = try await supabase
                .from("businesses").select("id, name, qr_code_secret")
                .eq("owner_id", value: userId).maybeSingle().execute().value
            business = biz
            if let biz, let secret = biz.qrCodeSecret {
                let payload = generateQRPayload(businessId: biz.id, secret: secret)
                qrImage = generateQRCode(from: payload)
            }
        } catch { print("Failed to load business: \(error)") }
        isLoading = false
    }

    private func generateQRPayload(businessId: UUID, secret: String) -> String {
        let timestamp = Int(Date().timeIntervalSince1970 / 240)
        return "\(businessId.uuidString):\(secret):\(timestamp)"
    }

    private func generateQRCode(from string: String) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"
        guard let ciImage = filter.outputImage else { return nil }
        let scaled = ciImage.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
        guard let cgImage = context.createCGImage(scaled, from: scaled.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}
