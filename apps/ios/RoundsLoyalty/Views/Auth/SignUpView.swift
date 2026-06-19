import SwiftUI

struct SignUpView: View {
    @Binding var showSignUp: Bool

    @State private var displayName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var role: UserRole = .customer
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var successMessage: String?

    var body: some View {
        ZStack {
            Color.brandCream.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 32) {
                    // Header
                    VStack(spacing: 8) {
                        Image(systemName: "cup.and.saucer.fill")
                            .font(.system(size: 56))
                            .foregroundColor(.brandGreen)
                        Text("Create Account")
                            .font(.largeTitle.bold())
                            .foregroundColor(.brandDarkGreen)
                    }
                    .padding(.top, 60)

                    // Form
                    VStack(spacing: 16) {
                        // Role picker
                        VStack(alignment: .leading, spacing: 6) {
                            Text("I am a...")
                                .font(.caption.weight(.semibold))
                                .foregroundColor(.brandDarkGreen)
                            Picker("Role", selection: $role) {
                                Text("Customer").tag(UserRole.customer)
                                Text("Vendor").tag(UserRole.vendor)
                            }
                            .pickerStyle(.segmented)
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("Name")
                                .font(.caption.weight(.semibold))
                                .foregroundColor(.brandDarkGreen)
                            TextField("Your name", text: $displayName)
                                .autocorrectionDisabled()
                                .padding()
                                .background(Color.white.opacity(0.7))
                                .cornerRadius(12)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.brandGreen.opacity(0.3), lineWidth: 1))
                        }

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
                            SecureField("At least 6 characters", text: $password)
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

                        if let successMessage {
                            Text(successMessage)
                                .font(.caption)
                                .foregroundColor(.brandGreen)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        Button {
                            Task { await signUp() }
                        } label: {
                            HStack {
                                if isLoading {
                                    ProgressView().tint(.white)
                                } else {
                                    Text("Create Account").font(.headline)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.brandGreen)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                        .disabled(isLoading || email.isEmpty || password.isEmpty || displayName.isEmpty)
                    }
                    .padding(.horizontal, 24)

                    // Sign in link
                    HStack {
                        Text("Already have an account?")
                            .foregroundColor(.brandTaupe)
                        Button("Sign in") {
                            showSignUp = false
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

    private func signUp() async {
        isLoading = true
        errorMessage = nil
        successMessage = nil
        do {
            try await supabase.auth.signUp(
                email: email,
                password: password,
                data: [
                    "display_name": AnyJSON.string(displayName),
                    "role": AnyJSON.string(role.rawValue)
                ]
            )
            successMessage = "Account created! Please check your email to confirm your account."
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
