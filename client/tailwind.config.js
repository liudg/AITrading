/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber-black': '#000000',
        'cyber-dark': '#0a0a0a',
        'cyber-gray': '#1a1a1a',
        'cyber-light': '#2a2a2a',
        'cyber-green': '#00ff41',
        'cyber-blue': '#00d9ff',
        'cyber-purple': '#bd00ff',
        'cyber-red': '#ff0055',
        'cyber-yellow': '#ffdd00',
      },
    },
  },
  plugins: [],
}

