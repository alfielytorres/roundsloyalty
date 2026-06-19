import SwiftUI

enum CustomerTab: Equatable {
    case home, discover, scan, rewards, profile
}

final class TabSelection: ObservableObject {
    @Published var tab: CustomerTab = .home
}
