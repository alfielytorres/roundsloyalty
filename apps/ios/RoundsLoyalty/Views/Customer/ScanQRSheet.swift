import SwiftUI

struct ScanQRSheet: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var activeTab: SheetTab = .myQR
    @State private var awardResult: AwardResult?
    @State private var awardVendor: Vendor?
    @State private var showNFC = false

    @StateObject private var nfcReader = NFCStampReader()
    @State private var isAwarding = false
    @State private var nfcError: String?

    enum SheetTab { case myQR, scanStore }

    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                // Tab picker
                HStack(spacing: 0) {
                    tabButton(label: "My QR Code", icon: "qrcode", tab: .myQR)
                    tabButton(label: "Scan Store", icon: "qrcode.viewfinder", tab: .scanStore)
                }
                .padding(4)
                .background(Color.white.opacity(0.08))
                .cornerRadius(14)
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 12)

                Divider().overlay(Color.glassBorder)

                if activeTab == .myQR {
                    CustomerQRView(onNFCStamp: NFCStampReader.isAvailable ? startNFCStamp : nil)
                } else {
                    MVPScanView(onAwardResult: { result, vendor in
                        awardResult = result
                        awardVendor = vendor
                        withAnimation { showNFC = true }
                    })
                }
            }

            // Show result overlay inside the same sheet to avoid SwiftUI fullScreenCover-in-sheet bug
            if showNFC, let result = awardResult {
                NFCReceiveView(result: result, vendor: awardVendor) {
                    withAnimation { showNFC = false }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                        awardResult = nil
                    }
                }
                .transition(.opacity)
                .zIndex(1)
            }

            if isAwarding {
                Color.black.opacity(0.6).ignoresSafeArea()
                VStack(spacing: 16) {
                    ProgressView().tint(.white).scaleEffect(1.4)
                    Text("Adding your stamp…").foregroundColor(.white).font(.headline)
                }
                .zIndex(2)
            }
        }
        .alert("Couldn't add stamp", isPresented: Binding(
            get: { nfcError != nil },
            set: { if !$0 { nfcError = nil } }
        )) {
            Button("OK", role: .cancel) { nfcError = nil }
        } message: {
            Text(nfcError ?? "")
        }
    }

    private func startNFCStamp() {
        nfcReader.scan(
            onToken: { token in Task { await processNFCToken(token) } },
            onError: { message in nfcError = message }
        )
    }

    @MainActor
    private func processNFCToken(_ token: String) async {
        guard sessionManager.session != nil else {
            nfcError = "Please sign in to collect stamps."
            return
        }
        isAwarding = true
        defer { isAwarding = false }

        struct NFCParams: Encodable {
            let p_nfc_token: String
        }

        do {
            let result: AwardResult = try await supabase.database
                .rpc("award_rounds_nfc", params: NFCParams(p_nfc_token: token))
                .execute()
                .value

            // Build a lightweight Vendor from the result's embedded vendor info.
            let vendor: Vendor? = result.vendor.map {
                Vendor(id: $0.id, businessName: $0.businessName, description: nil,
                       category: nil, logoUrl: nil, brandColor: $0.brandColor,
                       address: nil, lat: nil, lng: nil, joinToken: nil, status: "active",
                       stampIcon: nil, cardBackgroundUrl: nil)
            }

            awardVendor = vendor
            awardResult = result
            withAnimation { showNFC = true }
        } catch {
            nfcError = error.localizedDescription
        }
    }

    private func tabButton(label: String, icon: String, tab: SheetTab) -> some View {
        Button(action: { activeTab = tab }) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .medium))
                Text(label)
                    .font(.system(size: 14, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(activeTab == tab ? Color.white.opacity(0.15) : Color.clear)
            .foregroundColor(activeTab == tab ? .primaryText : .secondaryText)
            .cornerRadius(10)
        }
    }
}

// MARK: - MVP Scan View (calls award_rounds RPC)

struct MVPScanView: View {
    @EnvironmentObject var sessionManager: SessionManager
    var onAwardResult: (AwardResult, Vendor?) -> Void

    @State private var scanState: MVPScanState = .idle
    @State private var lastScannedPayload: String?

    enum MVPScanState {
        case idle
        case processing
        case error(String)
    }

    var body: some View {
        ZStack {
            QRScannerView { payload in
                guard case .idle = scanState else { return }
                guard payload != lastScannedPayload else { return }
                lastScannedPayload = payload
                Task { await processPayload(payload) }
            }
            .ignoresSafeArea()

            // Viewfinder overlay
            VStack {
                Spacer()
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.accentDefault, lineWidth: 3)
                    .frame(width: 240, height: 240)
                Text("Point camera at store QR code")
                    .font(.subheadline)
                    .foregroundColor(.white)
                    .padding(.top, 16)
                    .shadow(radius: 4)
                Spacer()
                Spacer()
            }

            switch scanState {
            case .processing:
                Color.black.opacity(0.6).ignoresSafeArea()
                VStack(spacing: 16) {
                    ProgressView().tint(.white).scaleEffect(1.4)
                    Text("Processing...").foregroundColor(.white).font(.headline)
                }
            case .error(let msg):
                Color.black.opacity(0.6).ignoresSafeArea()
                VStack(spacing: 16) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 56)).foregroundColor(.red)
                    Text("Scan Failed").font(.headline).foregroundColor(.white)
                    Text(msg).font(.subheadline).foregroundColor(.white.opacity(0.8))
                        .multilineTextAlignment(.center)
                    Button("Try Again") {
                        scanState = .idle
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { lastScannedPayload = nil }
                    }
                    .padding(.horizontal, 32).padding(.vertical, 12)
                    .background(Color.accentDefault)
                    .foregroundColor(.white).font(.headline).cornerRadius(12)
                }
                .padding()
            case .idle:
                EmptyView()
            }
        }
    }

    private func processPayload(_ payload: String) async {
        guard sessionManager.session != nil else { return }
        scanState = .processing

        struct QRParams: Encodable {
            let qr_payload: String
        }

        do {
            let result: AwardResult = try await supabase.database
                .rpc("award_rounds", params: QRParams(qr_payload: payload))
                .execute()
                .value

            // Build a lightweight Vendor from the result's embedded vendor info
            let vendor: Vendor? = result.vendor.map {
                Vendor(id: $0.id, businessName: $0.businessName, description: nil,
                       category: nil, logoUrl: nil, brandColor: $0.brandColor,
                       address: nil, lat: nil, lng: nil, joinToken: nil, status: "active",
                       stampIcon: nil, cardBackgroundUrl: nil)
            }

            await MainActor.run {
                scanState = .idle
                onAwardResult(result, vendor)
            }
        } catch {
            await MainActor.run {
                scanState = .error(error.localizedDescription)
            }
        }
    }
}
