/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bro-orange': '#d97706',
        'bro-blue': '#026aa3',
        'bro-dark': '#0f172a',
        'bro-slate': '#1e293b',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      boxShadow: {
        'glow-orange': '0 0 20px rgba(217, 119, 6, 0.3)',
        'glow-blue': '0 0 20px rgba(2, 106, 163, 0.3)',
      }
    },
  },
  plugins: [],
}
