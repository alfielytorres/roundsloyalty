export const HEX6 = /^#[0-9a-fA-F]{6}$/

// Resolve any CSS colour (named like "yellow", #rgb, rgb(), #rrggbb) to #RRGGBB.
// Returns '' when unresolved. Lets contrast maths run on real channels and keeps
// what we persist a clean hex the iOS app can parse.
export function resolveHex(input: string): string {
  if (!input) return ''
  if (HEX6.test(input)) return input.toUpperCase()
  if (typeof document === 'undefined') return ''
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return ''
  const probe = (sentinel: string) => { ctx.fillStyle = sentinel; ctx.fillStyle = input; return ctx.fillStyle }
  let r = probe('#010203')
  if (r.toLowerCase() === '#010203') { r = probe('#040506'); if (r.toLowerCase() === '#040506') return '' }
  if (r[0] === '#') return r.length === 7 ? r.toUpperCase() : ''
  const m = r.match(/[\d.]+/g)
  if (m && m.length >= 3) {
    const h = (n: string) => Math.round(parseFloat(n)).toString(16).padStart(2, '0')
    return ('#' + h(m[0]) + h(m[1]) + h(m[2])).toUpperCase()
  }
  return ''
}

// WCAG relative luminance (0…1, gamma-corrected) of a #rrggbb colour.
export function lum(hex: string): number {
  const h = hex.replace('#', '').trim()
  if (h.length !== 6) return 0
  const f = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  return 0.2126 * f(parseInt(h.slice(0, 2), 16)) + 0.7152 * f(parseInt(h.slice(2, 4), 16)) + 0.0722 * f(parseInt(h.slice(4, 6), 16))
}

// Black or white, whichever has the best contrast against the background.
export function textOn(hex: string): string {
  return lum(hex) > 0.179 ? '#1D1D1F' : '#ffffff'
}

export const STAMP_ICONS = [
  // Food & drink
  '☕', '🥐', '🍩', '🍪', '🍞', '🧋', '🍕', '🍔', '🌮', '🍦', '🍰', '🧁', '🍺', '🍷',
  // Sport & fitness
  '🎾', '🏓', '🏸', '🏀', '⚽', '🏐', '🏈', '⚾', '⛳', '🥊', '🏋️', '💪', '🧘', '🚴', '🏊', '🤸', '🥏', '🎯',
  // General
  '⭐', '❤️', '🎁', '🔥', '💎', '🏆',
]
