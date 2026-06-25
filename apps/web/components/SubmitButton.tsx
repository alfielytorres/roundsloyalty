'use client'

import { useState } from 'react'
import { flushSync } from 'react-dom'
import Spinner from './Spinner'

// Submit button for native (server-handled) <form action="/api/…"> forms. On a
// valid submit it shows a spinner while the browser POSTs and navigates.
//
// We must paint the spinner *before* the browser starts navigating away, so we
// flushSync the loading state synchronously inside the click handler (rAF/async
// state would never paint — the page is already unloading). We also avoid the
// `disabled` attribute, since a submit button disabled during its own click can
// cancel the submission; instead we guard against double-submits manually.
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
      aria-busy={loading}
      onClick={(e) => {
        if (loading) { e.preventDefault(); return } // block double-submit
        const form = e.currentTarget.form
        if (form && !form.checkValidity()) return    // let native validation show first
        flushSync(() => setLoading(true))            // commit spinner to DOM before navigation
      }}
      className={`${className ?? ''}${loading ? ' opacity-80 cursor-wait' : ''}`}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Spinner />{pendingText ?? children}
        </span>
      ) : children}
    </button>
  )
}
