import SwiftUI

struct CustomerTabView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @StateObject private var tabSelection = TabSelection()
    @State private var showScan = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // Content
            Group {
                switch tabSelection.tab {
                case .cards:   CardsView()
                case .discover: DiscoverMapView()
                case .scan:    CardsView() // scan opens as modal
                case .offers:  OffersView()
                case .profile: CustomerProfileView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .environmentObject(tabSelection)

            // Glassmorphic bottom nav
            GlassTabBar(tabSelection: tabSelection, onScanTap: { showScan = true })
        }
        .ignoresSafeArea(edges: .bottom)
        .sheet(isPresented: $showScan) {
            ScanQRSheet()
        }
    }
}

// MARK: - Glassmorphic Tab Bar

struct GlassTabBar: View {
    @ObservedObject var tabSelection: TabSelection
    var onScanTap: () -> Void

    var body: some View {
        ZStack {
            // Glass background
            RoundedRectangle(cornerRadius: 28)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 28)
                        .stroke(Color.white.opacity(0.4), lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.12), radius: 20, x: 0, y: -4)
                .frame(height: 80)

            HStack(spacing: 0) {
                GlassTabItem(icon: "creditcard.fill", label: "Cards", tab: .cards, tabSelection: tabSelection)
                GlassTabItem(icon: "map.fill", label: "Discover", tab: .discover, tabSelection: tabSelection)

                // Center scan button
                Button(action: onScanTap) {
                    ZStack {
                        Circle()
                            .fill(Color.brandGreen)
                            .frame(width: 60, height: 60)
                            .shadow(color: Color.brandGreen.opacity(0.4), radius: 12, x: 0, y: 4)
                        Image(systemName: "qrcode.viewfinder")
                            .font(.system(size: 26, weight: .medium))
                            .foregroundColor(.white)
                    }
                }
                .offset(y: -16)
                .frame(maxWidth: .infinity)

                GlassTabItem(icon: "bell.fill", label: "Offers", tab: .offers, tabSelection: tabSelection)
                GlassTabItem(icon: "person.fill", label: "Profile", tab: .profile, tabSelection: tabSelection)
            }
            .padding(.horizontal, 8)
            .padding(.bottom, 8)
            .frame(height: 80)
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
    }
}

struct GlassTabItem: View {
    let icon: String
    let label: String
    let tab: CustomerTab
    @ObservedObject var tabSelection: TabSelection

    var isSelected: Bool { tabSelection.tab == tab }

    var body: some View {
        Button(action: { tabSelection.tab = tab }) {
            VStack(spacing: 3) {
                Image(systemName: icon)
                    .font(.system(size: 20, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(isSelected ? .brandGreen : Color.brandTaupe)
                Text(label)
                    .font(.system(size: 10, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(isSelected ? .brandGreen : Color.brandTaupe)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 12)
        }
    }
}
