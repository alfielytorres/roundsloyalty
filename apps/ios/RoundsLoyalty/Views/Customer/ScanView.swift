import SwiftUI
import AVFoundation

// MARK: - QR Scanner infrastructure (used by MVPScanView in ScanQRSheet)

final class QRScannerCoordinator: NSObject, AVCaptureMetadataOutputObjectsDelegate {
    var onScan: (String) -> Void
    var session: AVCaptureSession?
    var previewLayer: AVCaptureVideoPreviewLayer?

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

        let coordinator = context.coordinator

        AVCaptureDevice.requestAccess(for: .video) { granted in
            guard granted else { return }
            DispatchQueue.main.async {
                guard let device = AVCaptureDevice.default(for: .video),
                      let input = try? AVCaptureDeviceInput(device: device) else { return }

                let session = AVCaptureSession()
                session.addInput(input)

                let metadataOutput = AVCaptureMetadataOutput()
                session.addOutput(metadataOutput)
                metadataOutput.setMetadataObjectsDelegate(coordinator, queue: .main)
                metadataOutput.metadataObjectTypes = [.qr]

                let preview = AVCaptureVideoPreviewLayer(session: session)
                preview.videoGravity = .resizeAspectFill
                preview.frame = view.bounds
                view.layer.addSublayer(preview)

                coordinator.session = session
                coordinator.previewLayer = preview

                DispatchQueue.global(qos: .userInitiated).async { session.startRunning() }
            }
        }

        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        DispatchQueue.main.async {
            context.coordinator.previewLayer?.frame = uiView.bounds
        }
    }
}
