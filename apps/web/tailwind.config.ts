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
        // Rounds signature accent (from the logo / PWA theme)
        rounds: {
          DEFAULT: '#9E1B32',
          hover: '#7E1428',
          soft: 'rgba(158,27,50,0.09)',
        },
        ink: '#1D1D1F',
        surface: '#F5F5F7',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        glass: '0 6px 24px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}

export default config
