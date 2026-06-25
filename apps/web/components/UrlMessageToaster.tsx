'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useToast } from './Toast'

// Turns ?success=… / ?error=… redirect params (set by form-handling API routes)
// into toasts on any page, then strips them from the URL so they don't re-fire.
export default function UrlMessageToaster() {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { show } = useToast()

  useEffect(() => {
    const error = params.get('error')
    const success = params.get('success')
    if (!error && !success) return

    if (success) show('success', success)
    if (error) show('error', error)

    const next = new URLSearchParams(params.toString())
    next.delete('error')
    next.delete('success')
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [params, pathname, router, show])

  return null
}
