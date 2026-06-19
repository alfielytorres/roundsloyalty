import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Store } from 'lucide-react'

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

  const { data: existing } = await supabase
    .from('vendors')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (existing) redirect('/dashboard')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-[#22C55E] flex items-center justify-center mb-6 shadow-[0_0_32px_rgba(34,197,94,0.35)]">
            <Store size={36} className="text-[#081C12]" />
          </div>
          <h1 className="text-3xl font-extrabold text-white text-center">Set up your store</h1>
          <p className="text-white/50 mt-2 text-center">Tell us about your business to get started</p>
        </div>

        {searchParams.error && (
          <div className="mb-4 rounded-2xl bg-red-500/20 border border-red-500/30 px-4 py-3 text-sm text-red-300">
            {searchParams.error}
          </div>
        )}

        <form action="/api/onboarding" method="POST" className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-white mb-1">Business name</label>
            <input
              type="text"
              name="business_name"
              required
              placeholder="e.g. The Coffee Corner"
              className="w-full dark-input"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1">Description</label>
            <input
              type="text"
              name="description"
              placeholder="Short description of your business"
              className="w-full dark-input"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1">Category</label>
            <select name="category" className="w-full dark-input">
              <option value="">Select a category</option>
              <option value="cafe">Cafe</option>
              <option value="restaurant">Restaurant</option>
              <option value="retail">Retail</option>
              <option value="beauty">Beauty &amp; Wellness</option>
              <option value="fitness">Fitness</option>
              <option value="other">Other</option>
            </select>
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 w-full bg-[#22C55E] hover:bg-[#16A34A] text-[#081C12] font-bold py-3 rounded-2xl mt-2 transition-colors"
          >
            <Store size={16} />Launch my store
          </button>
        </form>
      </div>
    </main>
  )
}
