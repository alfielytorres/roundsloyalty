export interface QRPayload {
  business_id: string
  timestamp: number
  nonce: string
  hmac: string
}

export async function generateQRPayload(businessId: string, secret: string): Promise<string> {
  const timestamp = Date.now()
  const nonceBytes = crypto.getRandomValues(new Uint8Array(16))
  const nonce = btoa(String.fromCharCode(...nonceBytes))
  const message = `${businessId}:${timestamp}:${nonce}`
  const hmac = await computeHmac(secret, message)
  const payload: QRPayload = { business_id: businessId, timestamp, nonce, hmac }
  return btoa(JSON.stringify(payload))
}

export function parseQRPayload(raw: string): QRPayload | null {
  try {
    return JSON.parse(atob(raw)) as QRPayload
  } catch {
    return null
  }
}

async function computeHmac(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

export const QR_REFRESH_INTERVAL_MS = 4 * 60 * 1000
