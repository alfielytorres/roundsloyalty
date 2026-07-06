import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Ops tooling is admin-only: the signed-in user's email must be in the
// ADMIN_EMAILS env var (comma-separated). Fails closed when unset — nobody is
// admin until you list yourself.
export async function getAdminUser() {
  const allow = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (allow.length === 0) return null

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase()
  if (!user || !email || !allow.includes(email)) return null
  return user
}
