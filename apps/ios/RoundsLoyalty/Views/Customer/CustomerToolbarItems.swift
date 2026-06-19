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
                        .fill(Color.brandGreen)
                        .frame(width: 32, height: 32)
                    Text(initials)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                }
            }
        }
        ToolbarItem(placement: .navigationBarTrailing) {
            Button(action: { tabSelection.tab = .offers }) {
                Image(systemName: "bell.fill")
                    .foregroundColor(.black)
            }
        }
    }
}
