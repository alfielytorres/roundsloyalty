import Foundation
import CoreNFC

/// Reads a registered store NFC tag and extracts its device token so the
/// signed-in customer can award themselves a round via the `award_rounds_nfc` RPC.
///
/// The store keeps its own tag and physically taps it against the customer's
/// phone while the customer is on the "My QR Code" screen. The tag holds a URL
/// of the form `https://<host>/s/<device_token>`; we only need the token. The
/// `/s/<id>?…` shape is intentional so the same tags can later carry NFC DNA
/// dynamic params (`?picc_data=&cmac=`) without being re-written.
final class NFCStampReader: NSObject, ObservableObject, NFCNDEFReaderSessionDelegate {
    private var session: NFCNDEFReaderSession?
    private var onToken: ((String) -> Void)?
    private var onError: ((String) -> Void)?

    /// True only on real hardware with an available NFC radio (never in the simulator).
    static var isAvailable: Bool { NFCNDEFReaderSession.readingAvailable }

    /// Presents the system "Hold near tag" sheet and reads a single tag.
    func scan(onToken: @escaping (String) -> Void, onError: @escaping (String) -> Void) {
        guard NFCNDEFReaderSession.readingAvailable else {
            onError("NFC isn't available on this device.")
            return
        }
        self.onToken = onToken
        self.onError = onError

        let session = NFCNDEFReaderSession(delegate: self, queue: nil, invalidateAfterFirstRead: true)
        session.alertMessage = "Hold the top of your phone to the store's tag."
        self.session = session
        session.begin()
    }

    // MARK: - NFCNDEFReaderSessionDelegate

    func readerSession(_ session: NFCNDEFReaderSession, didDetectNDEFs messages: [NFCNDEFMessage]) {
        guard let token = Self.extractToken(from: messages) else {
            session.invalidate(errorMessage: "This isn't a valid Rounds stamp tag.")
            DispatchQueue.main.async { [weak self] in self?.onError?("Unrecognised tag.") }
            return
        }
        session.alertMessage = "Stamp tag read."
        session.invalidate()
        DispatchQueue.main.async { [weak self] in self?.onToken?(token) }
    }

    func readerSession(_ session: NFCNDEFReaderSession, didInvalidateWithError error: Error) {
        // A successful single read and a user cancel both arrive here — neither is a failure.
        if let nfcError = error as? NFCReaderError {
            switch nfcError.code {
            case .readerSessionInvalidationErrorFirstNDEFTagRead,
                 .readerSessionInvalidationErrorUserCanceled:
                return
            default:
                break
            }
        }
        DispatchQueue.main.async { [weak self] in self?.onError?(error.localizedDescription) }
    }

    // MARK: - Token parsing

    /// Pulls the device token out of the tag's NDEF records. Prefers a URI
    /// record (`…/s/<token>`) and falls back to a plain-text token.
    static func extractToken(from messages: [NFCNDEFMessage]) -> String? {
        for message in messages {
            for record in message.records {
                if let url = record.wellKnownTypeURIPayload() {
                    if let token = token(fromURL: url) { return token }
                } else if let text = plainText(from: record), let token = token(fromText: text) {
                    return token
                }
            }
        }
        return nil
    }

    private static func token(fromURL url: URL) -> String? {
        // Token is the last path component; query params (reserved for DNA) are ignored.
        let last = url.lastPathComponent
        guard !last.isEmpty, last != "/", last != "s" else { return nil }
        return last
    }

    private static func token(fromText raw: String) -> String? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if let url = URL(string: trimmed), url.scheme != nil {
            return token(fromURL: url)
        }
        return trimmed.isEmpty ? nil : trimmed
    }

    /// Decodes a well-known Text ("T") record, stripping its status byte and
    /// language-code prefix; otherwise treats the payload as raw UTF-8.
    private static func plainText(from record: NFCNDEFPayload) -> String? {
        guard record.typeNameFormat == .nfcWellKnown,
              let type = String(data: record.type, encoding: .utf8), type == "T",
              let statusByte = record.payload.first else {
            return String(data: record.payload, encoding: .utf8)
        }
        let languageLength = Int(statusByte & 0x3F)
        let textData = record.payload.dropFirst(1 + languageLength)
        return String(data: textData, encoding: .utf8)
    }
}
