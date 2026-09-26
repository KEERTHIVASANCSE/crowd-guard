/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        soc: {
          bg: "#080b11",
          card: "#0f1523",
          border: "#1c2638",
          hover: "#182236",
          accent: "#00f0ff",
          emerald: "#10b981",
          warning: "#f59e0b",
          critical: "#ef4444",
          purple: "#a855f7"
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -5px rgba(0, 240, 255, 0.3)',
        'glow-red': '0 0 20px -5px rgba(239, 68, 68, 0.4)',
        'glow-warning': '0 0 20px -5px rgba(245, 158, 11, 0.3)',
      }
    },
  },
  plugins: [],
}
