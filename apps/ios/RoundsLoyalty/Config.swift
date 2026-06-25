import Foundation

enum Config {
    static var supabaseURL: String {
        guard let value = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
              !value.isEmpty else {
            fatalError("SUPABASE_URL not set in Info.plist / build settings")
        }
        return value
    }

    static var supabaseAnonKey: String {
        guard let value = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
              !value.isEmpty else {
            fatalError("SUPABASE_ANON_KEY not set in Info.plist / build settings")
        }
        return value
    }

    /// Public web app base URL (used as the password-reset redirect target).
    static var webURL: String {
        if let value = Bundle.main.object(forInfoDictionaryKey: "WEB_URL") as? String, !value.isEmpty {
            return value
        }
        return "https://roundsloyalty.vercel.app"
    }
}
