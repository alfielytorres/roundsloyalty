import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import OnboardingForm from './OnboardingForm'

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) redirect('/')

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: { getAll: () => cookieStore.getAll() },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Use limit(1) instead of maybeSingle() to handle accidental duplicates gracefully
  const { data: existing } = await supabase
    .from('vendors')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)

  if (existing && existing.length > 0) redirect('/dashboard')

  const defaultBusinessName = (user.user_metadata?.display_name as string) ?? ''

  return <OnboardingForm error={query.error} defaultBusinessName={defaultBusinessName} />
}
