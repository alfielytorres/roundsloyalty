import SwiftUI

enum CustomerTab: Equatable {
    case cards, discover, scan, offers, profile
}

final class TabSelection: ObservableObject {
    @Published var tab: CustomerTab = .cards
}
