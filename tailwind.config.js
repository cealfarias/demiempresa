/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: '#0A1120',
        darkcard: '#111C2E',
        darkborder: '#1E293B',
        mint: {
          50: '#E6FAF5',
          100: '#C2F5E8',
          400: '#10E3B2',
          500: '#00D09C',
          600: '#00A87E',
          700: '#008060',
        },
      },
      boxShadow: {
        'glow-mint': '0 0 25px -5px rgba(0, 208, 156, 0.45)',
        'glow-emerald': '0 0 20px -5px rgba(16, 185, 129, 0.4)',
        'glow-orange': '0 0 20px -5px rgba(249, 115, 22, 0.4)',
        'glow-cyan': '0 0 20px -5px rgba(6, 182, 212, 0.4)',
      },
    },
  },
  plugins: [],
}
