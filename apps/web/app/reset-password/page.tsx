'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Spinner from '@/components/Spinner'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ))
  const [ready, setReady] = useState(false)   // recovery session established
  const [checked, setChecked] = useState(false) // finished looking for one
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The email link drops a recovery session into the URL; supabase-js parses it
  // and fires onAuthStateChange. Wait for that before showing the form.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true)
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
      setChecked(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setLoading(false); setError(error.message); return }
    // Sign out so they re-authenticate cleanly (works whether they're a vendor or
    // a customer who reset from the app), and surface a success toast on login.
    await supabase.auth.signOut()
    router.push('/?success=' + encodeURIComponent('Password updated — please sign in.'))
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F5F5F7]">
      <div className="w-full max-w-xs">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.svg" alt="Rounds" width={56} height={56} unoptimized priority className="mb-4" />
          <p className="text-base font-bold tracking-tight text-black/30 mb-1.5">Rounds</p>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Set a new password</h1>
        </div>

        {!checked ? (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/90 shadow-sm p-8 flex justify-center">
            <Spinner size={20} className="text-black/40" />
          </div>
        ) : !ready ? (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/90 shadow-sm p-6 text-center">
            <p className="font-semibold text-[#1D1D1F] mb-1">Link expired or invalid</p>
            <p className="text-sm text-black/45">Please request a new password reset link.</p>
            <Link href="/forgot-password" className="inline-block mt-4 text-sm font-semibold text-black/60 hover:text-black">Request new link</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/90 shadow-sm p-5 flex flex-col gap-3">
            {error && <div className="rounded-2xl bg-black/5 border border-black/10 px-4 py-3 text-sm text-black/60">{error}</div>}
            <div>
              <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">New password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" disabled={loading}
                className="w-full bg-white/80 border border-black/10 rounded-xl px-3.5 py-2.5 text-[#1D1D1F] placeholder-black/25 text-sm focus:outline-none focus:border-black/25 transition-colors" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-black/35 tracking-widest uppercase mb-1.5">Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="••••••••" disabled={loading}
                className="w-full bg-white/80 border border-black/10 rounded-xl px-3.5 py-2.5 text-[#1D1D1F] placeholder-black/25 text-sm focus:outline-none focus:border-black/25 transition-colors" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-rounds hover:bg-rounds-hover disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors text-sm mt-1">
              {loading ? <><Spinner />Updating…</> : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
