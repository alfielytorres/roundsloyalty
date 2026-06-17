export const Colors = {
  primary: '#7DB542',
  primaryLight: '#D4EDBE',
  primaryDark: '#0D1F0D',
  cream: '#EDE9DF',
  taupe: '#C4BAA8',
  white: '#FFFFFF',
  black: '#000000',
  error: '#D94F3D',
  warning: '#E8A838',
  success: '#4CAF50',

  // Semantic aliases
  background: '#EDE9DF',
  surface: '#FFFFFF',
  textPrimary: '#0D1F0D',
  textSecondary: '#6B7280',
  textMuted: '#C4BAA8',
  border: '#E5E7EB',
  stampFilled: '#7DB542',
  stampEmpty: '#C4BAA8',
} as const

export type ColorKey = keyof typeof Colors
