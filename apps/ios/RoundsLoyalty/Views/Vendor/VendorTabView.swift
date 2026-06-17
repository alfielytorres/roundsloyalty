import SwiftUI

struct VendorTabView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.bar.fill")
                }

            QRView()
                .tabItem {
                    Label("My QR", systemImage: "qrcode")
                }

            CustomersView()
                .tabItem {
                    Label("Customers", systemImage: "person.2.fill")
                }

            VendorOffersView()
                .tabItem {
                    Label("Offers", systemImage: "megaphone.fill")
                }

            VendorSettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
        }
        .tint(.brandGreen)
    }
}
