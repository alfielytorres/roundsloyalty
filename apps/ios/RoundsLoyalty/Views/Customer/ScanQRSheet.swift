import SwiftUI

struct ScanQRSheet: View {
    @State private var activeTab: SheetTab = .myQR

    enum SheetTab { case myQR, scanStore }

    var body: some View {
        VStack(spacing: 0) {
            // Tab picker
            HStack(spacing: 0) {
                tabButton(label: "My QR Code", icon: "qrcode", tab: .myQR)
                tabButton(label: "Scan Store", icon: "qrcode.viewfinder", tab: .scanStore)
            }
            .padding(4)
            .background(Color.brandAccent)
            .cornerRadius(14)
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 12)

            Divider()

            if activeTab == .myQR {
                CustomerQRView()
            } else {
                ScanView()
            }
        }
        .background(Color.brandCream.ignoresSafeArea())
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
            .background(activeTab == tab ? Color.white : Color.clear)
            .foregroundColor(activeTab == tab ? .brandGreen : .brandTaupe)
            .cornerRadius(10)
            .shadow(color: activeTab == tab ? .black.opacity(0.06) : .clear, radius: 4)
        }
    }
}
