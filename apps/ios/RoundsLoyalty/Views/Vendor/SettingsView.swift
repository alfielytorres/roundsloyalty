import SwiftUI

struct VendorSettingsView: View {
    @EnvironmentObject var sessionManager: SessionManager

    // Business fields
    @State private var businessName = ""
    @State private var businessDescription = ""
    @State private var businessAddress = ""

    // Loyalty program
    @State private var programType: LoyaltyProgramType = .stamp
    @State private var stampsRequired = 10
    @State private var rewardDescription = ""
    @State private var pointsPerVisit = 1

    // State
    @State private var existingBusiness: Business?
    @State private var existingProgram: LoyaltyProgram?
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var successMessage: String?
    @State private var isSigningOut = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.brandCream.ignoresSafeArea()

                if isLoading {
                    ProgressView().tint(.brandGreen)
                } else {
                    List {
                        // Store details
                        Section(header: Text("Store Details").foregroundColor(.brandTaupe)) {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Business Name")
                                    .font(.caption.weight(.semibold))
                                    .foregroundColor(.brandDarkGreen)
                                TextField("Coffee House etc.", text: $businessName)
                            }
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Description")
                                    .font(.caption.weight(.semibold))
                                    .foregroundColor(.brandDarkGreen)
                                TextField("Speciality coffee roasters...", text: $businessDescription)
                            }
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Address")
                                    .font(.caption.weight(.semibold))
                                    .foregroundColor(.brandDarkGreen)
                                TextField("123 Main St, Sydney NSW", text: $businessAddress)
                            }
                        }
                        .listRowBackground(Color.white)

                        // Loyalty program
                        Section(header: Text("Loyalty Program").foregroundColor(.brandTaupe)) {
                            Picker("Program Type", selection: $programType) {
                                Text("Stamp Card").tag(LoyaltyProgramType.stamp)
                                Text("Points").tag(LoyaltyProgramType.points)
                                Text("Tiered").tag(LoyaltyProgramType.tiered)
                            }

                            if programType == .stamp {
                                Stepper("Stamps required: \(stampsRequired)", value: $stampsRequired, in: 1...50)

                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Reward")
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(.brandDarkGreen)
                                    TextField("e.g. Free coffee", text: $rewardDescription)
                                }
                            } else if programType == .points {
                                Stepper("Points per visit: \(pointsPerVisit)", value: $pointsPerVisit, in: 1...100)

                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Reward description")
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(.brandDarkGreen)
                                    TextField("e.g. 10 points = free drink", text: $rewardDescription)
                                }
                            } else {
                                // Tiered
                                Text("Tiered programs require the web portal to configure tiers.")
                                    .font(.caption)
                                    .foregroundColor(.brandTaupe)
                            }
                        }
                        .listRowBackground(Color.white)

                        // Error / success messages
                        if let errorMessage {
                            Section {
                                Text(errorMessage)
                                    .font(.caption)
                                    .foregroundColor(.red)
                            }
                            .listRowBackground(Color.white)
                        }

                        if let successMessage {
                            Section {
                                Text(successMessage)
                                    .font(.caption)
                                    .foregroundColor(.brandGreen)
                            }
                            .listRowBackground(Color.white)
                        }

                        // Save
                        Section {
                            Button {
                                Task { await saveSettings() }
                            } label: {
                                HStack {
                                    Spacer()
                                    if isSaving {
                                        ProgressView().tint(.white)
                                    } else {
                                        Text(existingBusiness == nil ? "Create Store" : "Save Changes")
                                            .fontWeight(.semibold)
                                    }
                                    Spacer()
                                }
                                .padding(.vertical, 4)
                            }
                            .foregroundColor(.white)
                            .listRowBackground(Color.brandGreen)
                            .disabled(isSaving || businessName.isEmpty)
                        }

                        // Sign out
                        Section {
                            Button(role: .destructive) {
                                Task { await signOut() }
                            } label: {
                                HStack {
                                    Spacer()
                                    if isSigningOut {
                                        ProgressView().tint(.red)
                                    } else {
                                        Label("Sign Out", systemImage: "arrow.right.square")
                                    }
                                    Spacer()
                                }
                            }
                        }
                        .listRowBackground(Color.white)
                    }
                    .listStyle(.insetGrouped)
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Settings")
            .task { await loadSettings() }
        }
    }

    private func loadSettings() async {
        guard let userId = sessionManager.session?.user.id else { return }
        do {
            let biz: Business? = try await supabase
                .from("businesses")
                .select()
                .eq("owner_id", value: userId)
                .maybeSingle()
                .execute()
                .value
            existingBusiness = biz

            if let biz {
                businessName = biz.name
                businessDescription = biz.description ?? ""
                businessAddress = biz.address ?? ""

                let program: LoyaltyProgram? = try await supabase
                    .from("loyalty_programs")
                    .select()
                    .eq("business_id", value: biz.id)
                    .eq("is_active", value: true)
                    .maybeSingle()
                    .execute()
                    .value
                existingProgram = program

                if let program {
                    programType = program.type
                    rewardDescription = program.rewardDescription ?? ""
                    stampsRequired = program.config?.stampsRequired ?? 10
                    pointsPerVisit = program.config?.pointsPerVisit ?? 1
                }
            }
        } catch {
            print("Failed to load settings: \(error)")
        }
        isLoading = false
    }

    private func saveSettings() async {
        guard let userId = sessionManager.session?.user.id else { return }
        isSaving = true
        errorMessage = nil
        successMessage = nil

        do {
            if let existing = existingBusiness {
                // Update business
                try await supabase
                    .from("businesses")
                    .update([
                        "name": businessName,
                        "description": businessDescription,
                        "address": businessAddress
                    ])
                    .eq("id", value: existing.id)
                    .execute()

                // Update program
                if let program = existingProgram {
                    try await supabase
                        .from("loyalty_programs")
                        .update([
                            "type": programType.rawValue,
                            "reward_description": rewardDescription
                        ])
                        .eq("id", value: program.id)
                        .execute()
                } else {
                    try await supabase
                        .from("loyalty_programs")
                        .insert([
                            "business_id": existing.id.uuidString,
                            "type": programType.rawValue,
                            "reward_description": rewardDescription,
                            "is_active": "true"
                        ])
                        .execute()
                }
                successMessage = "Store updated!"
            } else {
                // Create business
                let newBiz: Business = try await supabase
                    .from("businesses")
                    .insert([
                        "owner_id": userId.uuidString,
                        "name": businessName,
                        "description": businessDescription,
                        "address": businessAddress
                    ])
                    .select()
                    .single()
                    .execute()
                    .value
                existingBusiness = newBiz

                // Create loyalty program
                try await supabase
                    .from("loyalty_programs")
                    .insert([
                        "business_id": newBiz.id.uuidString,
                        "type": programType.rawValue,
                        "reward_description": rewardDescription,
                        "is_active": "true"
                    ])
                    .execute()

                successMessage = "Store created!"
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }

    private func buildConfig() -> [String: Any] {
        switch programType {
        case .stamp:
            return ["stamps_required": stampsRequired, "reward": rewardDescription]
        case .points:
            return ["points_per_visit": pointsPerVisit]
        case .tiered:
            return [:]
        }
    }

    private func signOut() async {
        isSigningOut = true
        try? await sessionManager.signOut()
        isSigningOut = false
    }
}
