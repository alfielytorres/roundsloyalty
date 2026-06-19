import SwiftUI
import MapKit
import CoreLocation

extension CLLocationCoordinate2D: @retroactive Equatable {
    public static func == (lhs: CLLocationCoordinate2D, rhs: CLLocationCoordinate2D) -> Bool {
        lhs.latitude == rhs.latitude && lhs.longitude == rhs.longitude
    }
}

final class LocationManager: NSObject, CLLocationManagerDelegate, ObservableObject {
    private let manager = CLLocationManager()
    @Published var userLocation: CLLocationCoordinate2D?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        let status = manager.authorizationStatus
        if status == .notDetermined {
            manager.requestWhenInUseAuthorization()
        } else if status == .authorizedWhenInUse || status == .authorizedAlways {
            manager.startUpdatingLocation()
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        DispatchQueue.main.async {
            if self.userLocation == nil {
                self.userLocation = loc.coordinate
            }
        }
        manager.stopUpdatingLocation()
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if manager.authorizationStatus == .authorizedWhenInUse ||
           manager.authorizationStatus == .authorizedAlways {
            manager.startUpdatingLocation()
        }
    }
}

struct DiscoverMapView: View {
    @StateObject private var locationManager = LocationManager()
    @State private var businesses: [Business] = []
    @State private var selectedBusiness: Business?
    @State private var isLoading = true
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: -33.8688, longitude: 151.2093),
        span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
    )
    @State private var didCenterOnUser = false

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                mapLayer
                bottomSheet
            }
            .navigationTitle("Discover")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { CustomerToolbarItems() }
            .task { await loadBusinesses() }
            .onChange(of: locationManager.userLocation) { coord in
                guard let coord = coord, !didCenterOnUser else { return }
                didCenterOnUser = true
                region.center = coord
            }
        }
    }

    @ViewBuilder private var mapLayer: some View {
        Map(coordinateRegion: $region,
            showsUserLocation: true,
            annotationItems: businesses.filter { $0.lat != nil && $0.lng != nil }) { biz in
            MapAnnotation(coordinate: CLLocationCoordinate2D(latitude: biz.lat ?? 0, longitude: biz.lng ?? 0)) {
                BusinessMapPin(business: biz, isSelected: selectedBusiness?.id == biz.id)
                    .onTapGesture { withAnimation { selectedBusiness = biz } }
            }
        }
        .ignoresSafeArea(edges: .top)
    }

    @ViewBuilder private var bottomSheet: some View {
        VStack(spacing: 0) {
            if isLoading {
                loadingIndicator
            } else if !businesses.isEmpty {
                businessCarousel
            }
        }
    }

    private var loadingIndicator: some View {
        ProgressView()
            .tint(.brandGreen)
            .padding()
            .background(Color.white.opacity(0.9))
            .cornerRadius(16)
            .padding()
    }

    private var businessCarousel: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(businesses) { biz in
                    let selected = selectedBusiness?.id == biz.id
                    BusinessCard(business: biz, isSelected: selected)
                        .onTapGesture { selectBusiness(biz) }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(Color.brandCream.opacity(0.95))
        .cornerRadius(20, corners: [.topLeft, .topRight])
    }

    private func selectBusiness(_ biz: Business) {
        let coord: CLLocationCoordinate2D? = (biz.lat != nil && biz.lng != nil)
            ? CLLocationCoordinate2D(latitude: biz.lat!, longitude: biz.lng!)
            : nil
        withAnimation {
            selectedBusiness = biz
            if let coord = coord { region.center = coord }
        }
    }

    private func loadBusinesses() async {
        do {
            let all: [Business] = try await supabase.database
                .from("businesses")
                .select("id, name, description, logo_url, address, lat, lng")
                .execute()
                .value
            businesses = all.filter { $0.lat != nil && $0.lng != nil }
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
                RoundsLogoMark(size: 22, color: isSelected ? .white : .brandGreen)
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
