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

  const formData = await req.formData()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const businessName = formData.get('businessName') as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'vendor',
        display_name: businessName,
      },
    },
  })

  if (error) {
    return NextResponse.redirect(
      new URL(`/sign-up?error=${encodeURIComponent(error.message)}`, req.url),
    )
  }

  // If email confirmation is required, session will be null
  if (!data.session) {
    return NextResponse.redirect(
      new URL('/sign-up?error=' + encodeURIComponent('Check your email to confirm your account, then sign in.'), req.url),
    )
  }

  // Sign them in immediately (works when email confirmation is disabled)
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent('Account created! Please sign in.')}`, req.url),
    )
  }

  return NextResponse.redirect(new URL('/onboarding', req.url))
}
