import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
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
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

export default config
