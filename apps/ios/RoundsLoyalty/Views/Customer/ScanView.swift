import SwiftUI
import AVFoundation

final class QRScannerCoordinator: NSObject, AVCaptureMetadataOutputObjectsDelegate {
    var onScan: (String) -> Void

    init(onScan: @escaping (String) -> Void) {
        self.onScan = onScan
    }

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              let value = object.stringValue else { return }
        onScan(value)
    }
}

struct QRScannerView: UIViewRepresentable {
    var onScan: (String) -> Void

    func makeCoordinator() -> QRScannerCoordinator {
        QRScannerCoordinator(onScan: onScan)
    }

    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.backgroundColor = .black

        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device) else {
            return view
        }

        let session = AVCaptureSession()
        session.addInput(input)

        let metadataOutput = AVCaptureMetadataOutput()
        session.addOutput(metadataOutput)
        metadataOutput.setMetadataObjectsDelegate(context.coordinator, queue: .main)
        metadataOutput.metadataObjectTypes = [.qr]

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.videoGravity = .resizeAspectFill
        view.layer.addSublayer(preview)
        view.tag = 1
        (view as UIView).layer.setValue(preview, forKey: "previewLayer")

        DispatchQueue.global(qos: .userInitiated).async { session.startRunning() }
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        if let preview = uiView.layer.value(forKey: "previewLayer") as? AVCaptureVideoPreviewLayer {
            preview.frame = uiView.bounds
        }
    }
}

enum ScanState {
    case idle
    case processing
    case requiresConsent(businessId: UUID, businessName: String, qrPayload: String)
    case success(result: ScanResult)
    case error(String)
}

struct ScanView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var scanState: ScanState = .idle
    @State private var lastScannedPayload: String?

    var body: some View {
        NavigationStack {
            ZStack {
                QRScannerView { payload in
                    guard case .idle = scanState else { return }
                    guard payload != lastScannedPayload else { return }
                    lastScannedPayload = payload
                    Task { await processQRPayload(payload) }
                }
                .ignoresSafeArea()

                VStack {
                    Spacer()
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.brandGreen, lineWidth: 3)
                        .frame(width: 240, height: 240)
                    Text("Point camera at a store QR code")
                        .font(.subheadline)
                        .foregroundColor(.white)
                        .padding(.top, 16)
                        .shadow(radius: 2)
                    Spacer()
                    Spacer()
                }

                switch scanState {
                case .processing: processingOverlay
                case .success(let result): successOverlay(result: result)
                case .requiresConsent(let businessId, let businessName, let qrPayload):
                    consentSheet(businessId: businessId, businessName: businessName, qrPayload: qrPayload)
                case .error(let msg): errorOverlay(message: msg)
                case .idle: EmptyView()
                }
            }
            .navigationTitle("Scan")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
        }
    }

    private var processingOverlay: some View {
        ZStack {
            Color.black.opacity(0.6).ignoresSafeArea()
            VStack(spacing: 16) {
                ProgressView().tint(.white).scaleEffect(1.4)
                Text("Processing...").foregroundColor(.white).font(.headline)
            }
        }
    }

    private func successOverlay(result: ScanResult) -> some View {
        ZStack {
            Color.black.opacity(0.6).ignoresSafeArea()
            VStack(spacing: 20) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 64))
                    .foregroundColor(.brandGreen)
                Text("+\(result.stampsAdded) stamp\(result.stampsAdded == 1 ? "" : "s")!")
                    .font(.largeTitle.bold())
                    .foregroundColor(.white)
                Text("at \(result.business.name)")
                    .font(.headline)
                    .foregroundColor(.brandLightGreen)
                if result.rewardUnlocked {
                    HStack {
                        Image(systemName: "gift.fill")
                        Text("Reward unlocked!")
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.brandGreen)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.brandDarkGreen.opacity(0.85))
                    .cornerRadius(20)
                }
                Button("Scan Another") { reset() }
                    .padding(.horizontal, 32)
                    .padding(.vertical, 12)
                    .background(Color.brandGreen)
                    .foregroundColor(.white)
                    .font(.headline)
                    .cornerRadius(12)
                    .padding(.top, 8)
            }
            .padding()
        }
    }

    private func consentSheet(businessId: UUID, businessName: String, qrPayload: String) -> some View {
        ZStack {
            Color.black.opacity(0.7).ignoresSafeArea()
            VStack(spacing: 20) {
                Image(systemName: "hand.raised.fill")
                    .font(.system(size: 48))
                    .foregroundColor(.brandGreen)
                Text("Share your data?")
                    .font(.title2.bold())
                    .foregroundColor(.white)
                Text("\(businessName) would like to track your visits and send you personalised offers. You can withdraw consent anytime from your profile.")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
                HStack(spacing: 12) {
                    Button("Decline") { reset() }
                        .frame(maxWidth: .infinity).padding()
                        .background(Color.brandDarkGreen.opacity(0.85))
                        .cornerRadius(12).foregroundColor(.white)
                    Button("Allow") {
                        Task { await grantConsentAndStamp(businessId: businessId, qrPayload: qrPayload) }
                    }
                    .frame(maxWidth: .infinity).padding()
                    .background(Color.brandGreen).foregroundColor(.white).cornerRadius(12)
                }
                .font(.headline)
            }
            .padding(28)
            .background(Color.brandDarkGreen.opacity(0.85))
            .cornerRadius(24)
            .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color.brandGreen.opacity(0.18), lineWidth: 0.5))
            .padding(.horizontal, 24)
        }
    }

    private func errorOverlay(message: String) -> some View {
        ZStack {
            Color.black.opacity(0.6).ignoresSafeArea()
            VStack(spacing: 16) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 56)).foregroundColor(.red)
                Text("Scan Failed").font(.headline).foregroundColor(.white)
                Text(message).font(.subheadline).foregroundColor(.white.opacity(0.8)).multilineTextAlignment(.center)
                Button("Try Again") { reset() }
                    .padding(.horizontal, 32).padding(.vertical, 12)
                    .background(Color.brandDarkGreen.opacity(0.85))
                    .foregroundColor(.white).font(.headline).cornerRadius(12)
            }
            .padding()
        }
    }

    private func reset() {
        scanState = .idle
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { lastScannedPayload = nil }
    }

    private func processQRPayload(_ payload: String) async {
        guard let session = sessionManager.session else { return }
        scanState = .processing
        do {
            struct StampResponse: Codable {
                let card: LoyaltyCardScanInfo
                let stampsAdded: Int
                let rewardUnlocked: Bool
                let business: Business
                let requiresConsent: Bool?
                let businessId: String?
                let businessName: String?
                enum CodingKeys: String, CodingKey {
                    case card
                    case stampsAdded = "stamps_added"
                    case rewardUnlocked = "reward_unlocked"
                    case business
                    case requiresConsent = "requires_consent"
                    case businessId = "business_id"
                    case businessName = "business_name"
                }
            }
            struct StampCardBody: Encodable { let qr_payload: String }
            let response: StampResponse = try await supabase.functions
                .invoke(
                    "stamp-card",
                    options: .init(
                        headers: ["Authorization": "Bearer \(session.accessToken)"],
                        body: StampCardBody(qr_payload: payload)
                    )
                )
            if response.requiresConsent == true,
               let businessIdStr = response.businessId,
               let businessId = UUID(uuidString: businessIdStr),
               let businessName = response.businessName {
                scanState = .requiresConsent(businessId: businessId, businessName: businessName, qrPayload: payload)
            } else {
                scanState = .success(result: ScanResult(
                    card: response.card,
                    stampsAdded: response.stampsAdded,
                    rewardUnlocked: response.rewardUnlocked,
                    business: response.business
                ))
            }
        } catch {
            scanState = .error(error.localizedDescription)
        }
    }

    private func grantConsentAndStamp(businessId: UUID, qrPayload: String) async {
        guard let userId = sessionManager.session?.user.id else { return }
        scanState = .processing
        do {
            try await supabase.database.from("data_consents")
                .insert(["customer_id": userId.uuidString, "business_id": businessId.uuidString])
                .execute()
            await processQRPayload(qrPayload)
        } catch {
            scanState = .error(error.localizedDescription)
        }
    }
}
