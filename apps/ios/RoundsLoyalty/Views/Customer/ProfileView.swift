import SwiftUI

struct CustomerProfileView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var isSigningOut = false
    @State private var showQR = false
    @State private var showEditName = false

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
                            Button { showEditName = true } label: {
                                ProfileRow(icon: "person.circle", label: "Edit Name")
                            }
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
            .sheet(isPresented: $showEditName) {
                EditNameSheet(currentName: profile?.displayName ?? "") {
                    await sessionManager.reloadProfile()
                }
            }
        }
    }

    private func signOut() async {
        isSigningOut = true
        try? await sessionManager.signOut()
        isSigningOut = false
    }
}

struct EditNameSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var saving = false
    @State private var error: String?
    var onSaved: () async -> Void

    init(currentName: String, onSaved: @escaping () async -> Void) {
        _name = State(initialValue: currentName)
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                VStack(spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("DISPLAY NAME")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.secondaryText)
                            .tracking(1.5)
                        TextField("Your name", text: $name)
                            .font(.body)
                            .padding(14)
                            .background(Color.glassCard)
                            .cornerRadius(12)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.glassBorder))
                            .foregroundColor(.primaryText)
                    }
                    if let error {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                    Button {
                        Task { await save() }
                    } label: {
                        Group {
                            if saving {
                                ProgressView().tint(.white)
                            } else {
                                Text("Save")
                                    .font(.headline)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.accentDefault)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(saving || name.trimmingCharacters(in: .whitespaces).isEmpty)
                    Spacer()
                }
                .padding(24)
            }
            .navigationTitle("Edit Name")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.secondaryText)
                }
            }
        }
    }

    private func save() async {
        saving = true
        error = nil
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        do {
            try await supabase.database
                .from("profiles")
                .update(["display_name": trimmed])
                .eq("id", value: (try? await supabase.auth.session.user.id.uuidString) ?? "")
                .execute()
            await onSaved()
            dismiss()
        } catch let e {
            error = e.localizedDescription
        }
        saving = false
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

