export const Colors = {
  // Core palette — dark forest green (me&u style)
  background:    '#081C12',
  surface:       '#0D2418',
  surfaceHigh:   '#122E1E',

  primary:       '#22C55E',
  primaryDark:   '#16A34A',
  primaryLight:  '#86EFAC',

  textPrimary:   '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted:     'rgba(255,255,255,0.30)',

  border:        'rgba(255,255,255,0.08)',
  borderStrong:  'rgba(34,197,94,0.30)',

  stampFilled:   '#22C55E',
  stampEmpty:    'rgba(255,255,255,0.12)',

  error:         '#EF4444',
  success:       '#22C55E',

  // Legacy aliases (keeps old imports working)
  cream:         '#0D2418',
  taupe:         'rgba(255,255,255,0.30)',
} as const

export type ColorKey = keyof typeof Colors
