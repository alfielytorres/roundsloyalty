import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  // Landing / sign-in for unauthenticated users
  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-4 shadow-lg">
            <span className="text-4xl font-black text-cream leading-none">R</span>
          </div>
          <h1 className="text-3xl font-extrabold text-primary-dark">Rounds Loyalty</h1>
          <p className="text-taupe mt-2 text-center">Vendor portal — reward your customers</p>
        </div>

        {/* Sign in form */}
        <form action="/api/auth/sign-in" method="POST" className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-primary-dark mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-primary-dark placeholder-taupe focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary-dark mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              placeholder="Your password"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-primary-dark placeholder-taupe focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white font-bold py-3 rounded-2xl mt-2 hover:opacity-90 transition-opacity"
          >
            Sign in
          </button>
        </form>

        <p className="text-center text-sm text-taupe mt-6">
          Customers? Use the{' '}
          <span className="font-semibold text-primary">Rounds Loyalty</span> mobile app.
        </p>
      </div>
    </main>
  )
}
