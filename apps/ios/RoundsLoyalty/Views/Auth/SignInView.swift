import SwiftUI

struct SignInView: View {
    @Binding var showSignUp: Bool

    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showForgot = false

    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 32) {
                    // Header
                    VStack(spacing: 8) {
                        RoundsLogoMark(size: 56)
                        Text("Weekends Club")
                            .font(.largeTitle.bold())
                            .kerning(-0.5)
                            .foregroundColor(.black)
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
                                .foregroundColor(.black)
                            TextField("you@example.com", text: $email)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .autocorrectionDisabled()
                                .padding()
                                .background(Color.white.opacity(0.7))
                                .cornerRadius(12)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.black.opacity(0.15), lineWidth: 1))
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("Password")
                                .font(.caption.weight(.semibold))
                                .foregroundColor(.black)
                            SecureField("••••••••", text: $password)
                                .padding()
                                .background(Color.white.opacity(0.7))
                                .cornerRadius(12)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.black.opacity(0.15), lineWidth: 1))
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
                            .background(Color.accentDefault)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                        .disabled(isLoading || email.isEmpty || password.isEmpty)

                        Button("Forgot password?") { showForgot = true }
                            .font(.footnote.weight(.medium))
                            .foregroundColor(.brandTaupe)
                    }
                    .padding(.horizontal, 24)

                    // Sign up link
                    HStack {
                        Text("Don't have an account?")
                            .foregroundColor(.brandTaupe)
                        Button("Sign up") {
                            showSignUp = true
                        }
                        .foregroundColor(.black)
                        .fontWeight(.semibold)
                    }
                    .font(.subheadline)

                    Spacer()
                }
            }
        }
        .sheet(isPresented: $showForgot) {
            ForgotPasswordSheet(prefillEmail: email)
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

struct ForgotPasswordSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var email: String
    @State private var isLoading = false
    @State private var sent = false
    @State private var error: String?

    init(prefillEmail: String = "") {
        _email = State(initialValue: prefillEmail)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                VStack(spacing: 24) {
                    if sent {
                        VStack(spacing: 12) {
                            Image(systemName: "envelope.badge")
                                .font(.system(size: 40))
                                .foregroundColor(.accentDefault)
                            Text("Check your email")
                                .font(.title3.bold())
                                .foregroundColor(.primaryText)
                            Text("If an account exists for that email, we've sent a link to reset your password.")
                                .font(.subheadline)
                                .foregroundColor(.secondaryText)
                                .multilineTextAlignment(.center)
                        }
                        .padding(.top, 40)
                    } else {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("EMAIL")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.secondaryText)
                                .tracking(1.5)
                            TextField("you@example.com", text: $email)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .autocorrectionDisabled()
                                .padding(14)
                                .background(Color.glassCard)
                                .cornerRadius(12)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.glassBorder))
                                .foregroundColor(.primaryText)
                        }
                        if let error {
                            Text(error).font(.caption).foregroundColor(.red)
                        }
                        Button {
                            Task { await sendReset() }
                        } label: {
                            Group {
                                if isLoading { ProgressView().tint(.white) }
                                else { Text("Send reset link").font(.headline) }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.accentDefault)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                        .disabled(isLoading || email.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                    Spacer()
                }
                .padding(24)
            }
            .navigationTitle("Reset password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(sent ? "Done" : "Cancel") { dismiss() }
                        .foregroundColor(.secondaryText)
                }
            }
        }
    }

    private func sendReset() async {
        isLoading = true
        error = nil
        let trimmed = email.trimmingCharacters(in: .whitespaces)
        do {
            try await supabase.auth.resetPasswordForEmail(
                trimmed,
                redirectTo: URL(string: Config.webURL + "/reset-password")
            )
            sent = true
        } catch let e {
            error = e.localizedDescription
        }
        isLoading = false
    }
}
