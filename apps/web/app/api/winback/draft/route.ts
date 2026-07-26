import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Drafts a re-engagement push for a lapsed customer. Uses Claude when an
// ANTHROPIC_API_KEY is configured (the "decide" step of the win-back loop);
// otherwise it falls back to a personalised template so the feature always
// works without any extra setup or subscription.

interface DraftReq {
  vendorName?: string
  customerName?: string
  daysSince?: number
  avgGap?: number | null
}

const firstNameOf = (name?: string) => {
  const n = (name ?? '').trim().split(/\s+/)[0]
  return n && n.toLowerCase() !== 'anonymous' ? n : ''
}

function templateDraft(vendorName: string, customerName: string, daysSince: number) {
  const first = firstNameOf(customerName)
  const hi = first ? `Hi ${first}, ` : ''
  const store = vendorName || 'us'
  const title = `${(vendorName || 'We')} miss${vendorName ? 'es' : ''} you 👋`.slice(0, 60)
  const body =
    `${hi}it's been ${daysSince} day${daysSince === 1 ? '' : 's'} since your last visit to ${store}. ` +
    `Your rounds are waiting — come back soon and pick up where you left off! ☕`
  return { title, body: body.slice(0, 280) }
}

async function aiDraft(
  apiKey: string,
  vendorName: string,
  customerName: string,
  daysSince: number,
  avgGap: number | null,
): Promise<{ title: string; body: string } | null> {
  const first = firstNameOf(customerName)
  const system =
    'You write short, warm re-engagement push notifications for a coffee/retail loyalty app called Weekends Club. ' +
    'Customers earn "rounds" (loyalty stamps) on each visit. Bring a lapsed customer back without being pushy or salesy. ' +
    'Return ONLY strict JSON: {"title": string, "body": string}. ' +
    'title <= 6 words, no emoji spam (one tasteful emoji max). body <= 180 characters, friendly, first-person from the store, ' +
    'mention it has been a while and invite them back. No discounts unless implied by "rounds". Do not invent offers.'
  const user = JSON.stringify({
    store: vendorName || 'the store',
    customer_first_name: first || null,
    days_since_last_visit: daysSince,
    usual_gap_days: avgGap,
  })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system,
      messages: [{ role: 'user', content: `Draft a win-back push for this customer:\n${user}` }],
    }),
  })
  if (!res.ok) return null
  const json = (await res.json()) as { content?: { type: string; text?: string }[] }
  const text = json.content?.find((c) => c.type === 'text')?.text ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0]) as { title?: unknown; body?: unknown }
    const title = typeof parsed.title === 'string' ? parsed.title.trim() : ''
    const body = typeof parsed.body === 'string' ? parsed.body.trim() : ''
    if (!title || !body) return null
    return { title: title.slice(0, 120), body: body.slice(0, 280) }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: DraftReq
  try {
    body = (await req.json()) as DraftReq
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const vendorName = (body.vendorName ?? '').toString().slice(0, 80)
  const customerName = (body.customerName ?? '').toString().slice(0, 80)
  const daysSince = Math.max(0, Math.min(3650, Math.round(Number(body.daysSince) || 0)))
  const avgGap = body.avgGap == null ? null : Number(body.avgGap)

  const fallback = templateDraft(vendorName, customerName, daysSince)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (apiKey) {
    try {
      const ai = await aiDraft(apiKey, vendorName, customerName, daysSince, avgGap)
      if (ai) return NextResponse.json({ ...ai, ai: true })
    } catch {
      // fall through to template
    }
  }

  return NextResponse.json({ ...fallback, ai: false })
}
