/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff8ed',
          100: '#fef0d7',
          200: '#fcdead',
          300: '#fac678',
          400: '#f7a441',
          500: '#f5871a',
          600: '#e66910',
          700: '#bf4f0f',
          800: '#983f14',
          900: '#7b3513',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
