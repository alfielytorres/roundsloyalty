import SwiftUI

struct CustomerToolbarItems: ToolbarContent {
    @EnvironmentObject var sessionManager: SessionManager
    @EnvironmentObject var tabSelection: TabSelection

    var initials: String {
        let email = sessionManager.session?.user.email ?? "?"
        return String(email.prefix(1)).uppercased()
    }

    var body: some ToolbarContent {
        ToolbarItem(placement: .navigationBarLeading) {
            Button(action: { tabSelection.tab = .profile }) {
                ZStack {
                    Circle()
                        .fill(Color.accentDefault.opacity(0.2))
                        .frame(width: 32, height: 32)
                    Text(initials)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.accentDefault)
                }
            }
        }
        ToolbarItem(placement: .navigationBarTrailing) {
            Button(action: { tabSelection.tab = .rewards }) {
                Image(systemName: "gift")
                    .foregroundColor(.primaryText)
            }
        }
    }
}
