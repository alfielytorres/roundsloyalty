import { UserPlus } from 'lucide-react'

export default function SignUpPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <img src="/logo.svg" alt="Rounds Loyalty" className="w-24 h-24 mb-4" />
          <h1 className="text-3xl font-extrabold text-white">Create account</h1>
          <p className="text-white/50 mt-2 text-center">Set up your vendor portal</p>
        </div>

        {searchParams.error && (
          <div className="mb-4 rounded-2xl bg-red-500/20 border border-red-500/30 px-4 py-3 text-sm text-red-300">
            {searchParams.error}
          </div>
        )}

        <form action="/api/auth/sign-up" method="POST" className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-white mb-1">
              Business name
            </label>
            <input
              type="text"
              name="businessName"
              required
              placeholder="e.g. The Coffee Corner"
              className="w-full dark-input"
            />
          </div>
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
              minLength={8}
              placeholder="Min. 8 characters"
              className="w-full dark-input"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 w-full bg-[#8B5CF6] text-white font-bold py-3 rounded-2xl mt-2 hover:opacity-90 transition-opacity"
          >
            <UserPlus size={16} />Create account
          </button>
        </form>

        <p className="text-center text-sm text-white/50 mt-6">
          Already have an account?{' '}
          <a href="/" className="font-semibold text-[#8B5CF6] hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  )
}
