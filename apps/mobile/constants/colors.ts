export const Colors = {
  // Core palette
  background: '#090B12',
  surface: 'rgba(255,255,255,0.06)',
  surfaceHover: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.10)',

  // Brand
  primary: '#8B5CF6',
  primaryHover: '#7C3AED',
  secondary: '#22D3EE',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',

  // Text
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: 'rgba(255,255,255,0.30)',

  // Misc
  white: '#FFFFFF',
  black: '#000000',

  // Stamp-specific
  stampFilled: '#8B5CF6',
  stampEmpty: 'rgba(255,255,255,0.15)',

  // Legacy aliases (keeps existing layout files from breaking)
  primaryDark: '#090B12',
  primaryLight: 'rgba(139,92,246,0.15)',
  cream: '#F8FAFC',
  taupe: '#94A3B8',
  error: '#F87171',
  textPrimary: '#F8FAFC',
} as const

export type ColorKey = keyof typeof Colors
