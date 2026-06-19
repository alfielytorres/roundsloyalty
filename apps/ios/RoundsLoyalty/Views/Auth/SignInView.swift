import SwiftUI

struct SignInView: View {
    @Binding var showSignUp: Bool

    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            Color.brandCream.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 32) {
                    // Header
                    VStack(spacing: 8) {
                        RoundsLogoMark(size: 56)
                        Text("Rounds Loyalty")
                            .font(.largeTitle.bold())
                            .foregroundColor(.brandDarkGreen)
                        Text("Welcome back")
                            .font(.subheadline)
                            .foregroundColor(.brandTaupe)
                    }
                    .padding(.top, 60)

                    // Form
                    VStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Email")
                                .font(.caption.weight(.semibold))
                                .foregroundColor(.brandDarkGreen)
                            TextField("you@example.com", text: $email)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .autocorrectionDisabled()
                                .padding()
                                .background(Color.white.opacity(0.7))
                                .cornerRadius(12)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.brandGreen.opacity(0.3), lineWidth: 1))
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("Password")
                                .font(.caption.weight(.semibold))
                                .foregroundColor(.brandDarkGreen)
                            SecureField("••••••••", text: $password)
                                .padding()
                                .background(Color.white.opacity(0.7))
                                .cornerRadius(12)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.brandGreen.opacity(0.3), lineWidth: 1))
                        }

                        if let errorMessage {
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundColor(.red)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        Button {
                            Task { await signIn() }
                        } label: {
                            HStack {
                                if isLoading {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Text("Sign In")
                                        .font(.headline)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.brandGreen)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                        .disabled(isLoading || email.isEmpty || password.isEmpty)
                    }
                    .padding(.horizontal, 24)

                    // Sign up link
                    HStack {
                        Text("Don't have an account?")
                            .foregroundColor(.brandTaupe)
                        Button("Sign up") {
                            showSignUp = true
                        }
                        .foregroundColor(.brandGreen)
                        .fontWeight(.semibold)
                    }
                    .font(.subheadline)

                    Spacer()
                }
            }
        }
    }

    private func signIn() async {
        isLoading = true
        errorMessage = nil
        do {
            try await supabase.auth.signIn(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
