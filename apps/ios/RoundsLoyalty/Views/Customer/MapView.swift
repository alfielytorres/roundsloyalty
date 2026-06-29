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
    let id: UUID            // location id — unique per map annotation
    let vendorId: UUID
    let name: String
    let address: String?
    let description: String?
    let category: String?
    let logoUrl: String?
    let brandColor: String?
    let lat: Double
    let lng: Double
}

struct DiscoverMapView: View {
    @StateObject private var locationManager = LocationManager()
    @State private var vendors: [VendorPin] = []
    @State private var mappableVendors: [VendorPin] = []
    @State private var selectedVendor: VendorPin?
    @State private var presentedStore: VendorPin?
    @State private var isLoading = true
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: -37.8136, longitude: 144.9631),
        span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
    )
    @State private var didCenterOnUser = false
    @State private var sheetHeight: CGFloat = 260

    var body: some View {
        NavigationStack {
            GeometryReader { _ in
                ZStack(alignment: .bottom) {
                    Map(coordinateRegion: $region,
                        showsUserLocation: true,
                        annotationItems: mappableVendors) { v in
                        MapAnnotation(coordinate: CLLocationCoordinate2D(latitude: v.lat, longitude: v.lng)) {
                            VendorMapPin(pin: v, isSelected: selectedVendor?.id == v.id)
                                .onTapGesture { presentedStore = v }
                        }
                    }
                    .ignoresSafeArea()

                    // Recenter button
                    VStack {
                        Spacer()
                        HStack {
                            Spacer()
                            Button(action: recenterMap) {
                                Image(systemName: "location.fill")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.white)
                                    .frame(width: 44, height: 44)
                                    .background(Color.primaryText)
                                    .clipShape(Circle())
                                    .overlay(Circle().stroke(Color.white.opacity(0.15), lineWidth: 1))
                                    .shadow(color: .black.opacity(0.4), radius: 6, x: 0, y: 2)
                            }
                            .padding(.trailing, 16)
                            .padding(.bottom, sheetHeight + 12)
                        }
                    }

                    bottomSheet
                        .frame(height: sheetHeight)
                }
                .ignoresSafeArea(edges: .bottom)
            }
            .navigationTitle("Discover")
            .navigationBarTitleDisplayMode(.inline)
            .task { await loadVendors() }
            .onChange(of: locationManager.userLocation) { coord in
                guard let coord = coord else { return }
                if !didCenterOnUser {
                    didCenterOnUser = true
                    withAnimation { region.center = coord }
                }
            }
            .sheet(item: $presentedStore) { store in
                StoreDetailView(pin: store)
            }
        }
    }

    @ViewBuilder private var bottomSheet: some View {
        VStack(spacing: 0) {
            // Drag handle
            RoundedRectangle(cornerRadius: 3)
                .fill(Color.black.opacity(0.15))
                .frame(width: 40, height: 5)
                .padding(.top, 10)
                .padding(.bottom, 8)

            if isLoading {
                Spacer()
                ProgressView().tint(.black.opacity(0.4))
                Spacer()
            } else if vendors.isEmpty {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "mappin.slash")
                        .font(.system(size: 32))
                        .foregroundColor(.secondaryText)
                    Text("No stores nearby")
                        .font(.subheadline)
                        .foregroundColor(.secondaryText)
                }
                Spacer()
            } else {
                HStack {
                    Text("\(vendors.count) store\(vendors.count == 1 ? "" : "s") nearby")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.primaryText)
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 8)

                Divider().overlay(Color.black.opacity(0.08))

                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 0) {
                        ForEach(vendors) { vendor in
                            VendorListRow(vendor: vendor, isSelected: selectedVendor?.id == vendor.id)
                                .onTapGesture { presentedStore = vendor }
                            if vendor.id != vendors.last?.id {
                                Divider().padding(.leading, 60).overlay(Color.black.opacity(0.06))
                            }
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity)
        .background(Color(hex: "#F5F5F7"))
        .cornerRadius(20, corners: [.topLeft, .topRight])
        .overlay(
            RoundedCorner(radius: 20, corners: [.topLeft, .topRight])
                .stroke(Color.black.opacity(0.06), lineWidth: 1)
        )
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
        // Each vendor location is a store pin. We pull the owning vendor's name and
        // active status via the embedded relationship.
        struct LocationRow: Decodable {
            let id: UUID
            let name: String
            let address: String?
            let lat: Double?
            let lng: Double?
            let vendors: VendorRef?
            struct VendorRef: Decodable {
                let id: UUID
                let businessName: String
                let status: String
                let brandColor: String?
                let logoUrl: String?
                let category: String?
                let description: String?
                enum CodingKeys: String, CodingKey {
                    case id
                    case businessName = "business_name"
                    case status
                    case brandColor = "brand_color"
                    case logoUrl = "logo_url"
                    case category
                    case description
                }
            }
        }
        do {
            let rows: [LocationRow] = try await supabase.database
                .from("vendor_locations")
                .select("id, name, address, lat, lng, vendors!inner(id, business_name, status, brand_color, logo_url, category, description)")
                .eq("vendors.status", value: "active")
                .execute()
                .value
            // Skip orphaned rows (no vendor) and keep the full pin so the list and
            // the map share the same store metadata (logo, brand colour, etc).
            let pins: [VendorPin] = rows.compactMap { row in
                guard let v = row.vendors else { return nil }
                return VendorPin(
                    id: row.id,
                    vendorId: v.id,
                    name: v.businessName,
                    address: row.address,
                    description: v.description,
                    category: v.category,
                    logoUrl: v.logoUrl,
                    brandColor: v.brandColor,
                    lat: row.lat ?? 0,
                    lng: row.lng ?? 0
                )
            }
            vendors = pins
            mappableVendors = pins.filter { $0.lat != 0 || $0.lng != 0 }
        } catch {
            print("Failed to load locations: \(error)")
        }
        isLoading = false
    }
}

struct VendorListRow: View {
    let vendor: VendorPin
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 14) {
            StoreAvatar(name: vendor.name, logoUrl: vendor.logoUrl, brandColor: vendor.brandColor, size: 40)

            VStack(alignment: .leading, spacing: 3) {
                Text(vendor.name)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.primaryText)
                    .lineLimit(1)
                if let address = vendor.address {
                    Text(address)
                        .font(.caption)
                        .foregroundColor(.secondaryText)
                        .lineLimit(1)
                } else if let cat = vendor.category {
                    Text(cat)
                        .font(.caption)
                        .foregroundColor(.secondaryText)
                        .lineLimit(1)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundColor(.secondaryText)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(isSelected ? Color.accentDefault.opacity(0.08) : Color.clear)
    }
}

struct VendorMapPin: View {
    let pin: VendorPin
    let isSelected: Bool

    private var accent: Color { Color.vendorAccent(pin.brandColor) }

    var body: some View {
        VStack(spacing: 0) {
            StoreAvatar(name: pin.name, logoUrl: pin.logoUrl, brandColor: pin.brandColor, size: 44)
                .overlay(Circle().stroke(Color.white, lineWidth: 2.5))
                .shadow(color: .black.opacity(0.25), radius: 4, x: 0, y: 2)
            Triangle()
                .fill(accent)
                .frame(width: 11, height: 7)
                .shadow(color: .black.opacity(0.15), radius: 1, x: 0, y: 1)
        }
        .scaleEffect(isSelected ? 1.2 : 1.0)
        .animation(.spring(response: 0.3), value: isSelected)
    }
}

/// A round store badge: the vendor's brand colour with their logo on top, or a
/// readable initial when no logo is set. Shared by the map pin and the list row.
struct StoreAvatar: View {
    let name: String
    let logoUrl: String?
    let brandColor: String?
    var size: CGFloat = 40

    private var accent: Color { Color.vendorAccent(brandColor) }
    private var initial: String {
        let c = name.trimmingCharacters(in: .whitespaces).first
        return c.map { String($0).uppercased() } ?? "?"
    }

    var body: some View {
        ZStack {
            Circle().fill(accent)
            if let logoUrl, let url = URL(string: logoUrl), !logoUrl.isEmpty {
                // White inner disc so logos with transparency stay legible on any brand colour.
                Circle().fill(Color.white).frame(width: size * 0.72, height: size * 0.72)
                AsyncImage(url: url) { img in
                    img.resizable().scaledToFit()
                } placeholder: {
                    Text(initial).font(.system(size: size * 0.4, weight: .bold)).foregroundColor(accent)
                }
                .frame(width: size * 0.56, height: size * 0.56)
                .clipShape(Circle())
            } else {
                Text(initial)
                    .font(.system(size: size * 0.42, weight: .bold))
                    .foregroundColor(Color.onColor(brandColor))
            }
        }
        .frame(width: size, height: size)
    }
}

/// Business details for a store discovered on the map. Works for any active
/// vendor — no membership required — so customers can scope out a store before
/// they join. Shows the brand-coloured header, what they get, about, and
/// directions.
struct StoreDetailView: View {
    let pin: VendorPin
    @Environment(\.dismiss) private var dismiss
    @State private var program: LoyaltyProgram?

    private var accent: Color { Color.vendorAccent(pin.brandColor) }
    private var onAccent: Color { Color.onColor(pin.brandColor) }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 16) {
                    // Brand header
                    VStack(spacing: 14) {
                        StoreAvatar(name: pin.name, logoUrl: pin.logoUrl, brandColor: pin.brandColor, size: 76)
                            .overlay(Circle().stroke(Color.white.opacity(0.7), lineWidth: 2))
                            .shadow(color: .black.opacity(0.15), radius: 6, x: 0, y: 3)
                        VStack(spacing: 4) {
                            Text(pin.name)
                                .font(.title3.weight(.bold))
                                .foregroundColor(onAccent)
                                .multilineTextAlignment(.center)
                            if let cat = pin.category, !cat.isEmpty {
                                Text(cat)
                                    .font(.subheadline)
                                    .foregroundColor(onAccent.opacity(0.85))
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 30)
                    .padding(.horizontal, 20)
                    .background(accent)
                    .cornerRadius(24)

                    // What you get
                    if let program {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("WHAT YOU GET")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.secondaryText)
                            HStack(spacing: 12) {
                                Image(systemName: "gift.fill")
                                    .font(.system(size: 18))
                                    .foregroundColor(accent)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(program.rewardName)
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundColor(.primaryText)
                                    Text("Earn it after \(program.roundsRequired) round\(program.roundsRequired == 1 ? "" : "s")")
                                        .font(.caption)
                                        .foregroundColor(.secondaryText)
                                }
                                Spacer()
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                        .darkGlassCard()
                    }

                    // About
                    if let desc = pin.description, !desc.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("ABOUT")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.secondaryText)
                            Text(desc)
                                .font(.subheadline)
                                .foregroundColor(.primaryText)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                        .darkGlassCard()
                    }

                    // Location + directions
                    VStack(alignment: .leading, spacing: 12) {
                        if let address = pin.address, !address.isEmpty {
                            Text("LOCATION")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.secondaryText)
                            Label(address, systemImage: "mappin.and.ellipse")
                                .font(.subheadline)
                                .foregroundColor(.primaryText)
                        }
                        Button(action: openDirections) {
                            HStack {
                                Image(systemName: "location.fill")
                                Text("Get Directions").font(.headline)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(accent)
                            .foregroundColor(onAccent)
                            .cornerRadius(14)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(16)
                    .darkGlassCard()
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 40)
            }
            .background(Color.appBackground.ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark").foregroundColor(.primaryText)
                    }
                }
            }
            .task { await loadProgram() }
        }
    }

    private func openDirections() {
        let dest: String
        if let address = pin.address, !address.isEmpty,
           let encoded = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            dest = encoded
        } else {
            dest = "\(pin.lat),\(pin.lng)"
        }
        if let url = URL(string: "maps://?daddr=\(dest)") {
            UIApplication.shared.open(url)
        }
    }

    private func loadProgram() async {
        let progs: [LoyaltyProgram] = (try? await supabase.database
            .from("loyalty_programs")
            .select("id, vendor_id, name, rounds_required, reward_name, reward_description, default_round_value, status")
            .eq("vendor_id", value: pin.vendorId)
            .eq("status", value: "active")
            .limit(1)
            .execute()
            .value) ?? []
        program = progs.first
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
