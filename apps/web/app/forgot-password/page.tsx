'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { MailCheck } from 'lucide-react'
import Spinner from '@/components/Spinner'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const email = (new FormData(e.currentTarget).get('email') as string).trim()
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F5F5F7]">
      <div className="w-full max-w-xs">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.svg" alt="Rounds" width={56} height={56} unoptimized priority className="mb-4" />
          <p className="text-base font-bold tracking-tight text-black/30 mb-1.5">Rounds</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Reset password</h1>
          <p className="text-black/40 mt-0.5 text-sm text-center">We&rsquo;ll email you a link to set a new one</p>
        </div>

        {sent ? (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/90 shadow-sm p-6 flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-1">
              <MailCheck size={22} className="text-emerald-500" />
            </div>
            <p className="font-semibold text-[#1D1D1F]">Check your email</p>
            <p className="text-sm text-black/45">If an account exists, we&rsquo;ve sent a link to reset your password. It may take a minute to arrive.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/90 shadow-sm p-5 flex flex-col gap-3">
            {error && <div className="rounded-2xl bg-black/5 border border-black/10 px-4 py-3 text-sm text-black/60">{error}</div>}
            <div>
              <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Email</label>
              <input type="email" name="email" required placeholder="you@example.com" disabled={loading}
                className="w-full bg-white/80 border border-black/10 rounded-xl px-3.5 py-2.5 text-[#1D1D1F] placeholder-black/25 text-sm focus:outline-none focus:border-black/25 transition-colors" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#1D1D1F] hover:bg-black disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors text-sm mt-1">
              {loading ? <><Spinner />Sending…</> : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="text-center text-[13px] text-black/30 mt-5">
          <Link href="/" className="font-semibold text-black/60 hover:text-black">Back to sign in</Link>
        </p>
      </div>
    </main>
  )
}
