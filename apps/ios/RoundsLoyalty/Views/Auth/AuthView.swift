import SwiftUI

struct AuthView: View {
    @State private var showSignUp = false

    var body: some View {
        if showSignUp {
            SignUpView(showSignUp: $showSignUp)
        } else {
            SignInView(showSignUp: $showSignUp)
        }
    }
}
