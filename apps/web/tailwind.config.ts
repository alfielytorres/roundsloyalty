import type { Config } from 'tailwindcss'
import path from 'path'

const config: Config = {
  content: [
    path.join(__dirname, 'app/**/*.{ts,tsx,js,jsx}'),
    path.join(__dirname, 'components/**/*.{ts,tsx,js,jsx}'),
  ],
  theme: {
    extend: {
      colors: {
        primary: '#22C55E',
        'primary-light': '#86EFAC',
        'primary-dark': '#16A34A',
        bg: '#081C12',
        surface: '#0D2418',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

export default config
