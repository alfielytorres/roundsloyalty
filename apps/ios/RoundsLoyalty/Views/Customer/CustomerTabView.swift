import SwiftUI

struct CustomerTabView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @StateObject private var tabSelection = TabSelection()
    @State private var showScan = false
    @State private var homeRefreshID = UUID()

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.appBackground.ignoresSafeArea()

            Group {
                switch tabSelection.tab {
                case .home:     HomeView().id(homeRefreshID)
                case .discover: DiscoverMapView()
                case .scan:     HomeView()
                case .rewards:  RewardsView()
                case .profile:  CustomerProfileView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .environmentObject(tabSelection)

            DarkTabBar(tabSelection: tabSelection, onScanTap: { showScan = true })
        }
        .ignoresSafeArea(edges: .bottom)
        .sheet(isPresented: $showScan, onDismiss: { homeRefreshID = UUID() }) {
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
            RoundedRectangle(cornerRadius: 28)
                .fill(Color.white.opacity(0.85))
                .overlay(RoundedRectangle(cornerRadius: 28).stroke(Color.white, lineWidth: 1))
                .shadow(color: .black.opacity(0.08), radius: 20, x: 0, y: -4)
                .frame(height: 80)

            HStack(spacing: 0) {
                DarkTabItem(icon: "house.fill", label: "Home", tab: .home, tabSelection: tabSelection)
                DarkTabItem(icon: "map.fill", label: "Discover", tab: .discover, tabSelection: tabSelection)

                Button(action: onScanTap) {
                    ZStack {
                        Circle()
                            .fill(Color.black)
                            .frame(width: 56, height: 56)
                        Image(systemName: "qrcode.viewfinder")
                            .font(.system(size: 22, weight: .semibold))
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
                    .foregroundColor(isSelected ? Color.black : Color.black.opacity(0.28))
                Text(label)
                    .font(.system(size: 10, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(isSelected ? Color.black : Color.black.opacity(0.28))
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 12)
        }
    }
}
