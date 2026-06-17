import SwiftUI

enum CustomerSegmentFilter: String, CaseIterable {
    case all
    case top
    case returning
    case atRisk = "at_risk"

    var label: String {
        switch self {
        case .all: return "All"
        case .top: return "Top"
        case .returning: return "Returning"
        case .atRisk: return "At Risk"
        }
    }
}

struct CustomersView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @State private var business: Business?
    @State private var customers: [CustomerSegment] = []
    @State private var selectedFilter: CustomerSegmentFilter = .all
    @State private var isLoading = true

    var filteredCustomers: [CustomerSegment] {
        guard selectedFilter != .all else { return customers }
        return customers.filter { $0.segment == selectedFilter.rawValue }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.brandCream.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Segment filter pills
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(CustomerSegmentFilter.allCases, id: \.self) { filter in
                                FilterPill(label: filter.label, isSelected: selectedFilter == filter) {
                                    selectedFilter = filter
                                }
                            }
                        }
                        .padding(.horizontal)
                        .padding(.vertical, 12)
                    }
                    .background(Color.white)

                    if isLoading {
                        Spacer()
                        ProgressView().tint(.brandGreen)
                        Spacer()
                    } else if filteredCustomers.isEmpty {
                        Spacer()
                        VStack(spacing: 12) {
                            Image(systemName: "person.slash")
                                .font(.system(size: 40))
                                .foregroundColor(.brandTaupe)
                            Text("No customers in this segment")
                                .font(.subheadline)
                                .foregroundColor(.brandTaupe)
                        }
                        Spacer()
                    } else {
                        List(filteredCustomers) { customer in
                            CustomerRow(customer: customer)
                                .listRowBackground(Color.white)
                                .listRowSeparatorTint(Color.brandTaupe.opacity(0.3))
                        }
                        .listStyle(.plain)
                        .scrollContentBackground(.hidden)
                    }
                }
            }
            .navigationTitle("Customers")
            .task { await loadCustomers() }
            .refreshable { await loadCustomers() }
        }
    }

    private func loadCustomers() async {
        guard let userId = sessionManager.session?.user.id else { return }
        isLoading = true
        do {
            let biz: Business? = try await supabase
                .from("businesses")
                .select("id")
                .eq("owner_id", value: userId)
                .maybeSingle()
                .execute()
                .value
            business = biz

            guard let bizId = biz?.id else {
                isLoading = false
                return
            }

            let fetched: [CustomerSegment] = try await supabase
                .from("vendor_customer_segments")
                .select()
                .eq("business_id", value: bizId)
                .order("total_visits", ascending: false)
                .execute()
                .value
            customers = fetched
        } catch {
            print("Failed to load customers: \(error)")
        }
        isLoading = false
    }
}

struct FilterPill: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.subheadline.weight(isSelected ? .semibold : .regular))
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.brandGreen : Color.brandLightGreen.opacity(0.5))
                .foregroundColor(isSelected ? .white : .brandDarkGreen)
                .cornerRadius(20)
        }
    }
}

struct CustomerRow: View {
    let customer: CustomerSegment

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(segmentColor.opacity(0.15))
                    .frame(width: 44, height: 44)
                Text(initials)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(segmentColor)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(customer.displayName ?? "Anonymous")
                    .font(.subheadline.weight(.medium))
                    .foregroundColor(.brandDarkGreen)
                HStack(spacing: 8) {
                    Label("\(customer.totalVisits) visits", systemImage: "arrow.triangle.2.circlepath")
                        .font(.caption)
                        .foregroundColor(.brandTaupe)
                    if let lastVisit = customer.lastVisit {
                        Text("·")
                            .foregroundColor(.brandTaupe)
                        Text(lastVisit.formatted(.relative(presentation: .named)))
                            .font(.caption)
                            .foregroundColor(.brandTaupe)
                    }
                }
            }

            Spacer()

            // Segment badge
            Text(segmentLabel)
                .font(.caption2.weight(.semibold))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(segmentColor.opacity(0.15))
                .foregroundColor(segmentColor)
                .cornerRadius(6)
        }
        .padding(.vertical, 4)
    }

    private var initials: String {
        let name = customer.displayName ?? "?"
        return name.split(separator: " ")
            .compactMap { $0.first.map { String($0) } }
            .prefix(2)
            .joined()
            .uppercased()
    }

    private var segmentLabel: String {
        switch customer.segment {
        case "top": return "Top"
        case "returning": return "Returning"
        case "at_risk": return "At Risk"
        default: return "Customer"
        }
    }

    private var segmentColor: Color {
        switch customer.segment {
        case "top": return .brandGreen
        case "returning": return .blue
        case "at_risk": return .orange
        default: return .brandTaupe
        }
    }
}
