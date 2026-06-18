import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LogIn } from 'lucide-react'

export default async function RootPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseKey) {
    const cookieStore = cookies()
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => cookieStore.getAll() },
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/dashboard')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <img src="/logo.svg" alt="Rounds Loyalty" className="w-24 h-24 mb-4" />
          <h1 className="text-3xl font-extrabold text-white">Rounds Loyalty</h1>
          <p className="text-white/50 mt-2 text-center">Vendor portal — reward your customers</p>
        </div>

        <form action="/api/auth/sign-in" method="POST" className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-white mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="w-full dark-input"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              placeholder="Your password"
              className="w-full dark-input"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 w-full bg-[#8B5CF6] text-white font-bold py-3 rounded-2xl mt-2 hover:opacity-90 transition-opacity"
          >
            <LogIn size={16} />Sign in
          </button>
        </form>

        <p className="text-center text-sm text-white/50 mt-4">
          No account?{' '}
          <Link href="/sign-up" className="font-semibold text-[#8B5CF6] hover:underline">
            Create one free
          </Link>
        </p>

        <p className="text-center text-sm text-white/50 mt-3">
          Customers? Use the{' '}
          <span className="font-semibold text-[#8B5CF6]">Rounds Loyalty</span> mobile app.
        </p>
      </div>
    </main>
  )
}
