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
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/', req.url))

  const formData = await req.formData()
  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string).trim()
  const address = (formData.get('address') as string).trim()

  if (!name) {
    return NextResponse.redirect(
      new URL('/settings?error=' + encodeURIComponent('Business name is required.'), req.url),
    )
  }

  const { error } = await supabase
    .from('businesses')
    .update({
      name,
      description: description || null,
      address: address || null,
    })
    .eq('owner_id', user.id)

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error.message)}`, req.url),
    )
  }

  return NextResponse.redirect(
    new URL('/settings?success=' + encodeURIComponent('Changes saved!'), req.url),
  )
}
