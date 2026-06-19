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

    func recenter() {
        manager.startUpdatingLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        DispatchQueue.main.async { self.userLocation = loc.coordinate }
        manager.stopUpdatingLocation()
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if manager.authorizationStatus == .authorizedWhenInUse ||
           manager.authorizationStatus == .authorizedAlways {
            manager.startUpdatingLocation()
        }
    }
}

struct VendorPin: Identifiable {
    let id: UUID
    let name: String
    let address: String?
    let description: String?
    let lat: Double
    let lng: Double
}

struct DiscoverMapView: View {
    @StateObject private var locationManager = LocationManager()
    @State private var vendors: [VendorPin] = []
    @State private var selectedVendor: VendorPin?
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
                recenterButton
                bottomSheet
            }
            .navigationTitle("Discover")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { CustomerToolbarItems() }
            .task { await loadVendors() }
            .onChange(of: locationManager.userLocation) { coord in
                guard let coord = coord, !didCenterOnUser else { return }
                didCenterOnUser = true
                withAnimation { region.center = coord }
            }
        }
    }

    @ViewBuilder private var mapLayer: some View {
        Map(coordinateRegion: $region,
            showsUserLocation: true,
            annotationItems: vendors) { v in
            MapAnnotation(coordinate: CLLocationCoordinate2D(latitude: v.lat, longitude: v.lng)) {
                VendorMapPin(isSelected: selectedVendor?.id == v.id)
                    .onTapGesture { withAnimation { selectedVendor = v } }
            }
        }
        .ignoresSafeArea(edges: .top)
    }

    private var recenterButton: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                Button(action: recenterMap) {
                    Image(systemName: "location.fill")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.brandGreen)
                        .frame(width: 44, height: 44)
                        .background(Color.white)
                        .clipShape(Circle())
                        .shadow(color: .black.opacity(0.15), radius: 6, x: 0, y: 2)
                }
                .padding(.trailing, 16)
                .padding(.bottom, vendors.isEmpty ? 20 : 190)
            }
        }
    }

    @ViewBuilder private var bottomSheet: some View {
        if isLoading {
            ProgressView()
                .tint(.brandGreen)
                .padding()
                .background(Color.white.opacity(0.9))
                .cornerRadius(16)
                .padding()
        } else if !vendors.isEmpty {
            vendorCarousel
        }
    }

    private var vendorCarousel: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(vendors) { vendor in
                    VendorCard(vendor: vendor, isSelected: selectedVendor?.id == vendor.id)
                        .onTapGesture { selectVendor(vendor) }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(Color.brandCream.opacity(0.95))
        .cornerRadius(20, corners: [.topLeft, .topRight])
    }

    private func selectVendor(_ vendor: VendorPin) {
        withAnimation {
            selectedVendor = vendor
            region.center = CLLocationCoordinate2D(latitude: vendor.lat, longitude: vendor.lng)
        }
    }

    private func recenterMap() {
        if let loc = locationManager.userLocation {
            withAnimation { region.center = loc }
        } else {
            locationManager.recenter()
        }
    }

    private func loadVendors() async {
        struct VendorRow: Decodable {
            let id: UUID
            let businessName: String
            let description: String?
            let address: String?
            let lat: Double?
            let lng: Double?
            enum CodingKeys: String, CodingKey {
                case id
                case businessName = "business_name"
                case description
                case address
                case lat
                case lng
            }
        }
        do {
            let rows: [VendorRow] = try await supabase.database
                .from("vendors")
                .select("id, business_name, description, address, lat, lng")
                .eq("status", value: "active")
                .execute()
                .value
            vendors = rows.compactMap { row in
                guard let lat = row.lat, let lng = row.lng else { return nil }
                return VendorPin(id: row.id, name: row.businessName, address: row.address,
                                 description: row.description, lat: lat, lng: lng)
            }
        } catch {
            print("Failed to load vendors: \(error)")
        }
        isLoading = false
    }
}

struct VendorMapPin: View {
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

struct VendorCard: View {
    let vendor: VendorPin
    let isSelected: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "storefront.fill")
                    .foregroundColor(.brandGreen)
                Text(vendor.name)
                    .font(.headline)
                    .foregroundColor(.black)
                    .lineLimit(1)
            }
            if let address = vendor.address {
                Text(address)
                    .font(.caption)
                    .foregroundColor(.brandTaupe)
                    .lineLimit(2)
            }
            if let description = vendor.description {
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
