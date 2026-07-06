// Ops tooling is admin-only. The founder account is always allowed; ADMIN_EMAILS
// (comma-separated) adds more without a code change.
const DEFAULT_ADMINS = ['alfielytorres@gmail.com']

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const allow = [
    ...DEFAULT_ADMINS,
    ...(process.env.ADMIN_EMAILS ?? '').split(','),
  ]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return allow.includes(email.toLowerCase())
}
