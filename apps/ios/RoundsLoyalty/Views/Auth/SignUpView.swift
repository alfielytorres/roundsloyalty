import SwiftUI

struct SignUpView: View {
    @Binding var showSignUp: Bool

    @State private var displayName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var birthday = BirthdayFormat.defaultDate
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var successMessage: String?

    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 32) {
                    VStack(spacing: 8) {
                        RoundsLogoMark(size: 56)
                        Text("Create Account")
                            .font(.largeTitle.bold())
                            .foregroundColor(.black)
                        Text("Join your favourite loyalty programs")
                            .font(.subheadline)
                            .foregroundColor(.brandTaupe)
                    }
                    .padding(.top, 60)

                    VStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Name")
                                .font(.caption.weight(.semibold))
                                .foregroundColor(.black)
                            TextField("Your name", text: $displayName)
                                .autocorrectionDisabled()
                                .padding()
                                .background(Color.white.opacity(0.7))
                                .cornerRadius(12)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.black.opacity(0.15), lineWidth: 1))
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("Birthday")
                                .font(.caption.weight(.semibold))
                                .foregroundColor(.black)
                            DatePicker("", selection: $birthday, in: BirthdayFormat.range, displayedComponents: .date)
                                .labelsHidden()
                                .datePickerStyle(.compact)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding()
                                .background(Color.white.opacity(0.7))
                                .cornerRadius(12)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.black.opacity(0.15), lineWidth: 1))
                            Text("Used by stores for birthday treats — never shown publicly.")
                                .font(.caption2)
                                .foregroundColor(.brandTaupe)
                        }

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
                            SecureField("At least 6 characters", text: $password)
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

                        if let successMessage {
                            Text(successMessage)
                                .font(.caption)
                                .foregroundColor(.black)
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
                            .background(Color.accentDefault)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                        .disabled(isLoading || email.isEmpty || password.isEmpty || displayName.isEmpty)
                    }
                    .padding(.horizontal, 24)

                    HStack {
                        Text("Already have an account?")
                            .foregroundColor(.brandTaupe)
                        Button("Sign in") { showSignUp = false }
                            .foregroundColor(.black)
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
            let response = try await supabase.auth.signUp(email: email, password: password)
            let user = response.user
            struct ProfileUpdate: Encodable { let display_name: String; let birthday: String }
            try await supabase.database
                .from("profiles")
                .update(ProfileUpdate(display_name: displayName, birthday: BirthdayFormat.string(from: birthday)))
                .eq("id", value: user.id.uuidString)
                .execute()
            successMessage = "Account created! Please check your email to confirm your account."
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
