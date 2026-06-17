import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: object }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/', req.url))

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!business) return NextResponse.redirect(new URL('/dashboard', req.url))

  const formData = await req.formData()
  const title = formData.get('title') as string
  const body = formData.get('body') as string
  const target_segment = formData.get('target_segment') as string

  const { data: offer, error } = await supabase
    .from('offers')
    .insert({ business_id: business.id, title, body, target_segment, sent_at: new Date().toISOString() })
    .select('id')
    .single()

  if (error) {
    return NextResponse.redirect(
      new URL(`/offers?error=${encodeURIComponent(error.message)}`, req.url),
    )
  }

  // Fan out to matching customers
  let customersQuery = supabase
    .from('vendor_customer_segments')
    .select('customer_id')
    .eq('business_id', business.id)

  if (target_segment !== 'all') {
    customersQuery = customersQuery.eq('segment', target_segment)
  }

  const { data: customers } = await customersQuery

  if (customers?.length && offer) {
    const recipients = customers.map((c) => ({
      offer_id: offer.id,
      customer_id: c.customer_id,
    }))
    await supabase.from('offer_recipients').insert(recipients)
  }

  const count = customers?.length ?? 0
  return NextResponse.redirect(
    new URL(`/offers?success=${encodeURIComponent(`Offer sent to ${count} customer${count !== 1 ? 's' : ''}!`)}`, req.url),
  )
}
