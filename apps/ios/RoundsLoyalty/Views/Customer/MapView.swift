import SwiftUI
import MapKit

struct DiscoverMapView: View {
    @State private var businesses: [Business] = []
    @State private var selectedBusiness: Business?
    @State private var isLoading = true

    // Default to Sydney
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: -33.8688, longitude: 151.2093),
        span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
    )

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                Map(coordinateRegion: $region, annotationItems: businesses.filter { $0.lat != nil && $0.lng != nil }) { biz in
                    MapAnnotation(coordinate: CLLocationCoordinate2D(latitude: biz.lat ?? 0, longitude: biz.lng ?? 0)) {
                        BusinessMapPin(business: biz, isSelected: selectedBusiness?.id == biz.id)
                            .onTapGesture {
                                withAnimation { selectedBusiness = biz }
                            }
                    }
                }
                .ignoresSafeArea(edges: .top)

                // Bottom sheet with horizontal scroll of businesses
                VStack(spacing: 0) {
                    if isLoading {
                        ProgressView()
                            .tint(.brandGreen)
                            .padding()
                            .background(Color.white.opacity(0.9))
                            .cornerRadius(16)
                            .padding()
                    } else if !businesses.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(businesses) { biz in
                                    BusinessCard(business: biz, isSelected: selectedBusiness?.id == biz.id)
                                        .onTapGesture {
                                            withAnimation {
                                                selectedBusiness = biz
                                                if let lat = biz.lat, let lng = biz.lng {
                                                    region.center = CLLocationCoordinate2D(latitude: lat, longitude: lng)
                                                }
                                            }
                                        }
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                        }
                        .background(Color.brandCream.opacity(0.95))
                        .cornerRadius(20, corners: [.topLeft, .topRight])
                    }
                }
            }
            .navigationTitle("Discover")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { CustomerToolbarItems() }
            .task { await loadBusinesses() }
        }
    }

    private func loadBusinesses() async {
        do {
            let fetched: [Business] = try await supabase.database
                .from("businesses")
                .select("id, name, description, logo_url, address, lat, lng")
                .not("lat", operator: "is", value: "null")
                .not("lng", operator: "is", value: "null")
                .execute()
                .value
            businesses = fetched
            if let first = fetched.first(where: { $0.lat != nil && $0.lng != nil }),
               let lat = first.lat, let lng = first.lng {
                region.center = CLLocationCoordinate2D(latitude: lat, longitude: lng)
            }
        } catch {
            print("Failed to load businesses: \(error)")
        }
        isLoading = false
    }
}

struct BusinessMapPin: View {
    let business: Business
    let isSelected: Bool

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(isSelected ? Color.brandGreen : Color.white)
                    .frame(width: 40, height: 40)
                    .shadow(radius: 3)
                Image(systemName: "cup.and.saucer.fill")
                    .foregroundColor(isSelected ? .white : .brandGreen)
                    .font(.system(size: 18))
            }
            Triangle()
                .fill(isSelected ? Color.brandGreen : Color.white)
                .frame(width: 10, height: 6)
        }
        .scaleEffect(isSelected ? 1.2 : 1.0)
        .animation(.spring(response: 0.3), value: isSelected)
    }
}

struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.closeSubpath()
        return path
    }
}

struct BusinessCard: View {
    let business: Business
    let isSelected: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "storefront.fill")
                    .foregroundColor(.brandGreen)
                Text(business.name)
                    .font(.headline)
                    .foregroundColor(.brandDarkGreen)
                    .lineLimit(1)
            }
            if let address = business.address {
                Text(address)
                    .font(.caption)
                    .foregroundColor(.brandTaupe)
                    .lineLimit(2)
            }
            if let description = business.description {
                Text(description)
                    .font(.caption2)
                    .foregroundColor(.brandTaupe)
                    .lineLimit(2)
            }
        }
        .padding(12)
        .frame(width: 200)
        .glassCard(cornerRadius: 12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isSelected ? Color.brandGreen : Color.clear, lineWidth: 2)
        )
    }
}

// Helper: round specific corners
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat
    var corners: UIRectCorner

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}
