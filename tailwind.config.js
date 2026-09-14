/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: '#0B0F17',
        darkcard: '#131B29',
        darkborder: '#1E293B',
      },
      boxShadow: {
        'glow-emerald': '0 0 20px -5px rgba(16, 185, 129, 0.4)',
        'glow-orange': '0 0 20px -5px rgba(249, 115, 22, 0.4)',
        'glow-cyan': '0 0 20px -5px rgba(6, 182, 212, 0.4)',
      },
    },
  },
  plugins: [],
}
