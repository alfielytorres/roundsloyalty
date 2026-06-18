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
        primary: '#7DB542',
        'primary-light': '#D4EDBE',
        'primary-dark': '#0D1F0D',
        cream: '#EDE9DF',
        taupe: '#C4BAA8',
        forest: {
          DEFAULT: '#0D1F0D',
          light: '#D4EDBE',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

export default config
