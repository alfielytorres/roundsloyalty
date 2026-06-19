import SwiftUI
import CoreImage.CIFilterBuiltins

struct CustomerQRView: View {
    @EnvironmentObject var sessionManager: SessionManager

    var userId: String? { sessionManager.session?.user.id.uuidString }

    var body: some View {
        VStack(spacing: 24) {
            Text("My QR Code")
                .font(.title2.bold())
                .foregroundColor(.black)

            Text("Show this to the store to earn points")
                .font(.subheadline)
                .foregroundColor(.brandTaupe)
                .multilineTextAlignment(.center)

            if let userId = userId, let qrImage = generateQR(from: userId) {
                Image(uiImage: qrImage)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 240, height: 240)
                    .padding(20)
                    .background(Color.white)
                    .cornerRadius(20)
                    .shadow(color: .black.opacity(0.08), radius: 12, x: 0, y: 4)

                Text(userId)
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(.brandSubtle)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            } else {
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.brandAccent)
                    .frame(width: 240, height: 240)
                    .overlay(Text("Sign in to view QR").foregroundColor(.brandTaupe))
            }

            Spacer()
        }
        .padding(.top, 32)
        .padding(.horizontal, 24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.brandCream.ignoresSafeArea())
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
