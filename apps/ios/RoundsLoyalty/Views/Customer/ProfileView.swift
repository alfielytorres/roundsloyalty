import SwiftUI
import CoreImage.CIFilterBuiltins

struct CustomerProfileView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var isSigningOut = false
    @State private var showQR = false

    var profile: Profile? { sessionManager.profile }

    private var initials: String {
        let name = profile?.displayName ?? "C"
        return name.split(separator: " ")
            .compactMap { $0.first.map { String($0) } }
            .prefix(2)
            .joined()
            .uppercased()
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 20) {
                        // Avatar + name
                        VStack(spacing: 12) {
                            ZStack {
                                Circle()
                                    .fill(Color.accentDefault.opacity(0.2))
                                    .frame(width: 80, height: 80)
                                Text(initials)
                                    .font(.system(size: 32, weight: .bold))
                                    .foregroundColor(.accentDefault)
                            }
                            Text(profile?.displayName ?? "Customer")
                                .font(.title3.bold())
                                .foregroundColor(.primaryText)
                            Text(sessionManager.session?.user.email ?? "")
                                .font(.subheadline)
                                .foregroundColor(.secondaryText)
                        }
                        .padding(.top, 20)

                        // Customer QR
                        Button {
                            showQR = true
                        } label: {
                            HStack {
                                Image(systemName: "qrcode")
                                    .font(.system(size: 20))
                                    .foregroundColor(.accentDefault)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("My Customer Code")
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundColor(.primaryText)
                                    Text("Show to store to earn rounds")
                                        .font(.caption)
                                        .foregroundColor(.secondaryText)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.secondaryText)
                            }
                            .padding(16)
                            .darkGlassCard()
                        }
                        .padding(.horizontal, 20)

                        // Settings section
                        VStack(spacing: 1) {
                            ProfileRow(icon: "person.circle", label: "Account Details")
                            ProfileRow(icon: "bell", label: "Notifications")
                            ProfileRow(icon: "lock.shield", label: "Privacy")
                        }
                        .padding(.horizontal, 20)

                        // Sign out
                        Button(role: .destructive) {
                            Task { await signOut() }
                        } label: {
                            HStack {
                                if isSigningOut {
                                    ProgressView().tint(.red)
                                } else {
                                    Image(systemName: "arrow.right.square")
                                    Text("Sign Out")
                                        .font(.subheadline.weight(.semibold))
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .foregroundColor(.red)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.red.opacity(0.2), lineWidth: 1)
                            )
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 8)

                        Spacer(minLength: 80)
                    }
                }
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $showQR) {
                CustomerQRView()
            }
        }
    }

    private func signOut() async {
        isSigningOut = true
        try? await sessionManager.signOut()
        isSigningOut = false
    }
}

struct ProfileRow: View {
    let icon: String
    let label: String

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(.secondaryText)
                .frame(width: 24)
            Text(label)
                .font(.subheadline)
                .foregroundColor(.primaryText)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondaryText)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(Color.glassCard)
        .overlay(
            Rectangle()
                .fill(Color.glassBorder)
                .frame(height: 0.5),
            alignment: .bottom
        )
    }
}
