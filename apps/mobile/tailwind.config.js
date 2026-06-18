/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#7DB542',
        'primary-light': '#D4EDBE',
        'primary-dark': '#0D1F0D',
        cream: '#EDE9DF',
        taupe: '#C4BAA8',
        background: '#EDE9DF',
      },
      fontFamily: {
        sans: ['DMSans-Regular'],
        'sans-medium': ['DMSans-Medium'],
        'sans-bold': ['DMSans-Bold'],
        'sans-extrabold': ['DMSans-ExtraBold'],
      },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
}
