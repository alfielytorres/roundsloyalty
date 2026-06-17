import SwiftUI

struct CustomerTabView: View {
    var body: some View {
        TabView {
            CardsView()
                .tabItem {
                    Label("My Cards", systemImage: "creditcard.fill")
                }

            ScanView()
                .tabItem {
                    Label("Scan", systemImage: "qrcode.viewfinder")
                }

            DiscoverMapView()
                .tabItem {
                    Label("Discover", systemImage: "map.fill")
                }

            OffersView()
                .tabItem {
                    Label("Offers", systemImage: "bell.fill")
                }

            CustomerProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.fill")
                }
        }
        .tint(.brandGreen)
    }
}
