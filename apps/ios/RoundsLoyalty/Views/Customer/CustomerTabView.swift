import SwiftUI

struct CustomerTabView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @StateObject private var tabSelection = TabSelection()
    @State private var showScan = false

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.appBackground.ignoresSafeArea()

            Group {
                switch tabSelection.tab {
                case .home:     HomeView()
                case .discover: DiscoverMapView()
                case .scan:     HomeView() // scan opens as modal
                case .rewards:  RewardsView()
                case .profile:  CustomerProfileView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .environmentObject(tabSelection)

            DarkTabBar(tabSelection: tabSelection, onScanTap: { showScan = true })
        }
        .ignoresSafeArea(edges: .bottom)
        .sheet(isPresented: $showScan) {
            ScanQRSheet()
        }
    }
}

// MARK: - Dark Tab Bar

struct DarkTabBar: View {
    @ObservedObject var tabSelection: TabSelection
    var onScanTap: () -> Void

    var body: some View {
        ZStack {
            // Dark glass background
            RoundedRectangle(cornerRadius: 28)
                .fill(Color(hex: "#111111").opacity(0.95))
                .overlay(
                    RoundedRectangle(cornerRadius: 28)
                        .stroke(Color.white.opacity(0.12), lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.5), radius: 20, x: 0, y: -4)
                .frame(height: 80)

            HStack(spacing: 0) {
                DarkTabItem(icon: "house.fill", label: "Home", tab: .home, tabSelection: tabSelection)
                DarkTabItem(icon: "map.fill", label: "Discover", tab: .discover, tabSelection: tabSelection)

                // Center scan button
                Button(action: onScanTap) {
                    ZStack {
                        Circle()
                            .fill(Color.accentDefault)
                            .frame(width: 58, height: 58)
                            .shadow(color: Color.accentDefault.opacity(0.4), radius: 12, x: 0, y: 4)
                        Image(systemName: "qrcode.viewfinder")
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundColor(.white)
                    }
                }
                .offset(y: -16)
                .frame(maxWidth: .infinity)

                DarkTabItem(icon: "gift.fill", label: "Rewards", tab: .rewards, tabSelection: tabSelection)
                DarkTabItem(icon: "person.fill", label: "Profile", tab: .profile, tabSelection: tabSelection)
            }
            .padding(.horizontal, 8)
            .padding(.bottom, 8)
            .frame(height: 80)
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 24)
    }
}

struct DarkTabItem: View {
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
                    .foregroundColor(isSelected ? .accentDefault : Color.secondaryText)
                Text(label)
                    .font(.system(size: 10, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(isSelected ? .accentDefault : Color.secondaryText)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 12)
        }
    }
}
