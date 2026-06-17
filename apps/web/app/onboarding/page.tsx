import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function OnboardingPage({ searchParams }: { searchParams: { error?: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) redirect('/')

  const cookieStore = cookies()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: { getAll: () => cookieStore.getAll() },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // If they already have a business, go to dashboard
  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (existing) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <img src="/logo.svg" alt="Rounds Loyalty" className="w-24 h-24 mb-4" />
          <h1 className="text-3xl font-extrabold text-primary-dark">Set up your store</h1>
          <p className="text-taupe mt-2 text-center">Tell us about your business</p>
        </div>

        {searchParams.error && (
          <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {searchParams.error}
          </div>
        )}

        <form action="/api/onboarding" method="POST" className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-primary-dark mb-1">Business name</label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. The Coffee Corner"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-primary-dark placeholder-taupe focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary-dark mb-1">Description</label>
            <input
              type="text"
              name="description"
              placeholder="Short description of your business"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-primary-dark placeholder-taupe focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary-dark mb-1">Address</label>
            <input
              type="text"
              name="address"
              placeholder="123 Main St, City"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-primary-dark placeholder-taupe focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white font-bold py-3 rounded-2xl mt-2 hover:opacity-90 transition-opacity"
          >
            Launch my store →
          </button>
        </form>
      </div>
    </main>
  )
}
