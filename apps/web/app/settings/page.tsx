import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string }
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) redirect('/')

  const cookieStore = cookies()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: { getAll: () => cookieStore.getAll() },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!business) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-cream p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-taupe text-sm mb-2 block hover:text-primary">
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold text-primary-dark">Settings</h1>
          <p className="text-taupe mt-1">Update your business details</p>
        </div>

        {searchParams.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {searchParams.error}
          </div>
        )}
        {searchParams.success && (
          <div className="mb-6 p-4 bg-primary-light border border-primary rounded-2xl text-primary-dark text-sm font-semibold">
            {searchParams.success}
          </div>
        )}

        <div className="bg-white rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-primary-dark mb-6">Business details</h2>
          <form action="/api/settings" method="POST" className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-primary-dark mb-2">
                Business name
              </label>
              <input
                name="name"
                required
                defaultValue={business.name ?? ''}
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-primary-dark focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary-dark mb-2">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                defaultValue={business.description ?? ''}
                placeholder="Tell customers what you do"
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-primary-dark focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary-dark mb-2">
                Address
              </label>
              <input
                name="address"
                defaultValue={business.address ?? ''}
                placeholder="123 Main St, City"
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-primary-dark focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                className="bg-primary text-white font-bold px-8 py-3 rounded-2xl hover:opacity-90 transition-opacity"
              >
                Save changes
              </button>
            </div>
          </form>
        </div>

        {/* Account */}
        <div className="bg-white rounded-3xl p-8 shadow-sm mt-6">
          <h2 className="text-xl font-bold text-primary-dark mb-2">Account</h2>
          <p className="text-taupe text-sm mb-5">{user.email}</p>
          <form action="/api/auth/sign-out" method="POST">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl border-2 border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
