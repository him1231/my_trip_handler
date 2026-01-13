/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf2f4',
          100: '#fce7ea',
          200: '#f9d2d9',
          300: '#f4adb9',
          400: '#ed7d93',
          500: '#e94560',
          600: '#d52d4a',
          700: '#b3213c',
          800: '#951e37',
          900: '#7d1d34',
        },
        dark: {
          100: '#1a1a2e',
          200: '#16213e',
          300: '#0f3460',
        }
      }
    },
  },
  plugins: [],
}
