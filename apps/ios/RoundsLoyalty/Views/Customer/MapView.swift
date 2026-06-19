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
    @State private var mappableVendors: [VendorPin] = []
    @State private var selectedVendor: VendorPin?
    @State private var isLoading = true
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: -37.8136, longitude: 144.9631),
        span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
    )
    @State private var didCenterOnUser = false
    @State private var sheetHeight: CGFloat = 260
    @State private var actionVendor: VendorPin?

    var body: some View {
        NavigationStack {
            GeometryReader { geo in
                ZStack(alignment: .bottom) {
                    Map(coordinateRegion: $region,
                        showsUserLocation: true,
                        annotationItems: mappableVendors) { v in
                        MapAnnotation(coordinate: CLLocationCoordinate2D(latitude: v.lat, longitude: v.lng)) {
                            VendorMapPin(isSelected: selectedVendor?.id == v.id)
                                .onTapGesture { actionVendor = v }
                        }
                    }
                    .ignoresSafeArea()

                    // Recenter button — floats above the sheet
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
                                    .shadow(color: .black.opacity(0.18), radius: 6, x: 0, y: 2)
                            }
                            .padding(.trailing, 16)
                            .padding(.bottom, sheetHeight + 12)
                        }
                    }

                    // Bottom sheet
                    bottomSheet
                        .frame(height: sheetHeight)
                }
                .ignoresSafeArea(edges: .bottom)
            }
            .navigationTitle("Discover")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { CustomerToolbarItems() }
            .task { await loadVendors() }
            .onChange(of: locationManager.userLocation) { coord in
                guard let coord = coord else { return }
                if !didCenterOnUser {
                    didCenterOnUser = true
                    withAnimation { region.center = coord }
                }
            }
            .confirmationDialog(
                actionVendor?.name ?? "",
                isPresented: Binding(get: { actionVendor != nil }, set: { if !$0 { actionVendor = nil } }),
                titleVisibility: .visible
            ) {
                if let v = actionVendor {
                    Button("Get Directions") {
                        let url = URL(string: "maps://?daddr=\(v.lat),\(v.lng)")!
                        UIApplication.shared.open(url)
                    }
                    Button("Centre on Map") {
                        withAnimation(.spring(response: 0.35)) {
                            selectedVendor = v
                            region.center = CLLocationCoordinate2D(latitude: v.lat, longitude: v.lng)
                        }
                    }
                    Button("Cancel", role: .cancel) {}
                }
            } message: {
                if let address = actionVendor?.address { Text(address) }
            }
        }
    }

    @ViewBuilder private var bottomSheet: some View {
        VStack(spacing: 0) {
            // Drag handle
            RoundedRectangle(cornerRadius: 3)
                .fill(Color.gray.opacity(0.35))
                .frame(width: 40, height: 5)
                .padding(.top, 10)
                .padding(.bottom, 8)

            if isLoading {
                Spacer()
                ProgressView().tint(.brandGreen)
                Spacer()
            } else if vendors.isEmpty {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "mappin.slash")
                        .font(.system(size: 32))
                        .foregroundColor(.brandTaupe)
                    Text("No stores nearby")
                        .font(.subheadline)
                        .foregroundColor(.brandTaupe)
                }
                Spacer()
            } else {
                // Header count
                HStack {
                    Text("\(vendors.count) store\(vendors.count == 1 ? "" : "s") nearby")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.black)
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 8)

                Divider()

                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 0) {
                        ForEach(vendors) { vendor in
                            VendorListRow(vendor: vendor, isSelected: selectedVendor?.id == vendor.id)
                                .onTapGesture { actionVendor = vendor }
                            if vendor.id != vendors.last?.id {
                                Divider().padding(.leading, 60)
                            }
                        }
                    }
                }
            }
        }
        .background(Color.white)
        .cornerRadius(20, corners: [.topLeft, .topRight])
        .shadow(color: .black.opacity(0.12), radius: 12, x: 0, y: -4)
        .gesture(
            DragGesture()
                .onChanged { value in
                    let newHeight = sheetHeight - value.translation.height
                    sheetHeight = min(max(newHeight, 120), 520)
                }
        )
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
            // All vendors in the list
            vendors = rows.map { row in
                VendorPin(id: row.id, name: row.businessName, address: row.address,
                          description: row.description, lat: row.lat ?? 0, lng: row.lng ?? 0)
            }
            // Only vendors with real coordinates get a map pin
            mappableVendors = rows.compactMap { row in
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

struct VendorListRow: View {
    let vendor: VendorPin
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(isSelected ? Color.brandGreen : Color.brandLightGreen)
                    .frame(width: 40, height: 40)
                Image(systemName: "storefront.fill")
                    .font(.system(size: 16))
                    .foregroundColor(isSelected ? .white : .brandGreen)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(vendor.name)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.black)
                    .lineLimit(1)
                if let address = vendor.address {
                    Text(address)
                        .font(.caption)
                        .foregroundColor(.gray)
                        .lineLimit(1)
                } else if let desc = vendor.description {
                    Text(desc)
                        .font(.caption)
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundColor(.gray.opacity(0.5))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(isSelected ? Color.brandGreen.opacity(0.05) : Color.clear)
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
