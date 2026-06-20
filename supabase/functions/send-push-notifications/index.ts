/**
 * Supabase Edge Function: send-push-notifications
 *
 * Reads `pending` rows from customer_notifications, sends APNs pushes,
 * then updates each row to `delivered` or `failed`.
 *
 * Required environment secrets (set via `supabase secrets set`):
 *   APNS_KEY_ID      – 10-char key ID from Apple Developer
 *   APNS_TEAM_ID     – 10-char team ID from Apple Developer
 *   APNS_BUNDLE_ID   – e.g. com.yourcompany.roundsloyalty
 *   APNS_PRIVATE_KEY – contents of the .p8 file (EC private key, PEM format)
 *
 * Invoke via a pg_cron job every minute, or call manually:
 *   supabase functions invoke send-push-notifications
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5'

const APNS_URL = 'https://api.push.apple.com/3/device/'
const APNS_SANDBOX_URL = 'https://api.sandbox.push.apple.com/3/device/'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

async function buildApnsJwt(): Promise<string> {
  const keyId   = Deno.env.get('APNS_KEY_ID')!
  const teamId  = Deno.env.get('APNS_TEAM_ID')!
  const pemKey  = Deno.env.get('APNS_PRIVATE_KEY')!.replace(/\\n/g, '\n')
  const privKey = await importPKCS8(pemKey, 'ES256')
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .sign(privKey)
}

async function sendApns(token: string, title: string, body: string, jwt: string): Promise<{ ok: boolean; reason?: string }> {
  const bundleId = Deno.env.get('APNS_BUNDLE_ID')!
  const useSandbox = Deno.env.get('APNS_SANDBOX') === 'true'
  const url = (useSandbox ? APNS_SANDBOX_URL : APNS_URL) + token

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      aps: {
        alert: { title, body },
        sound: 'default',
        badge: 1,
      },
    }),
  })

  if (res.status === 200) return { ok: true }
  const json = await res.json().catch(() => ({}))
  return { ok: false, reason: (json as { reason?: string }).reason ?? `HTTP ${res.status}` }
}

Deno.serve(async () => {
  // Check required secrets exist
  const keyId = Deno.env.get('APNS_KEY_ID')
  if (!keyId) {
    return new Response(JSON.stringify({ skipped: true, reason: 'APNS secrets not configured' }), {
      headers: { 'content-type': 'application/json' },
    })
  }

  // Fetch pending notifications with push tokens
  const { data: pending, error } = await supabase
    .from('customer_notifications')
    .select('id, customer_id, title, body')
    .eq('status', 'pending')
    .limit(50)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  if (!pending || pending.length === 0) return new Response(JSON.stringify({ sent: 0 }))

  const jwt = await buildApnsJwt()
  let sent = 0, failed = 0

  for (const notif of pending) {
    // Get push tokens for this customer
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('customer_id', notif.customer_id)
      .eq('platform', 'ios')

    if (!tokens || tokens.length === 0) {
      // No token — mark as failed
      await supabase
        .from('customer_notifications')
        .update({ status: 'failed', error_message: 'No push token registered', sent_at: new Date().toISOString() })
        .eq('id', notif.id)
      failed++
      continue
    }

    // Send to all tokens (user may have multiple devices)
    let anyOk = false
    let lastError: string | undefined
    for (const { token } of tokens) {
      const result = await sendApns(token, notif.title, notif.body, jwt)
      if (result.ok) anyOk = true
      else lastError = result.reason
    }

    await supabase
      .from('customer_notifications')
      .update({
        status: anyOk ? 'delivered' : 'failed',
        error_message: anyOk ? null : lastError,
        sent_at: new Date().toISOString(),
      })
      .eq('id', notif.id)

    if (anyOk) sent++; else failed++
  }

  return new Response(JSON.stringify({ sent, failed }), {
    headers: { 'content-type': 'application/json' },
  })
})
