export default function SignUpPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-4 shadow-lg">
            <span className="text-4xl font-black text-cream leading-none">R</span>
          </div>
          <h1 className="text-3xl font-extrabold text-primary-dark">Create account</h1>
          <p className="text-taupe mt-2 text-center">Set up your vendor portal</p>
        </div>

        {searchParams.error && (
          <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {searchParams.error}
          </div>
        )}

        <form action="/api/auth/sign-up" method="POST" className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-primary-dark mb-1">
              Business name
            </label>
            <input
              type="text"
              name="businessName"
              required
              placeholder="e.g. The Coffee Corner"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-primary-dark placeholder-taupe focus:outline-none focus:border-primary transition-colors"
            />
          </div>
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
              minLength={8}
              placeholder="Min. 8 characters"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-primary-dark placeholder-taupe focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white font-bold py-3 rounded-2xl mt-2 hover:opacity-90 transition-opacity"
          >
            Create account
          </button>
        </form>

        <p className="text-center text-sm text-taupe mt-6">
          Already have an account?{' '}
          <a href="/" className="font-semibold text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  )
}
