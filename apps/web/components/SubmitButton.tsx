'use client'

import { useState } from 'react'
import Spinner from './Spinner'

// Submit button for native (server-handled) <form action="/api/…"> forms. On a
// valid submit it shows a spinner while the browser POSTs and navigates. The
// pending state is set on the next frame so disabling never cancels the submit.
export default function SubmitButton({
  children, className, pendingText,
}: {
  children: React.ReactNode
  className?: string
  pendingText?: string
}) {
  const [loading, setLoading] = useState(false)
  return (
    <button
      type="submit"
      disabled={loading}
      aria-busy={loading}
      onClick={(e) => {
        const form = e.currentTarget.form
        if (form && !form.checkValidity()) return // let native validation show first
        requestAnimationFrame(() => setLoading(true))
      }}
      className={className}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Spinner />{pendingText ?? children}
        </span>
      ) : children}
    </button>
  )
}
