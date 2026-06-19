import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: object }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/', req.url))

  const formData = await req.formData()
  const campaign_id = formData.get('campaign_id') as string

  if (!campaign_id) {
    return NextResponse.redirect(new URL('/campaigns?error=' + encodeURIComponent('Campaign ID missing.'), req.url))
  }

  const { error } = await supabase
    .from('round_campaigns')
    .update({ status: 'cancelled' })
    .eq('id', campaign_id)

  if (error) {
    return NextResponse.redirect(new URL('/campaigns?error=' + encodeURIComponent(error.message), req.url))
  }

  return NextResponse.redirect(new URL('/campaigns?success=' + encodeURIComponent('Campaign ended.'), req.url))
}
