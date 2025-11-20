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
          dark: '#0B1B3D',
          blue: '#0047AB',
          gold: '#D4AF37',
          lightGold: '#FFD700',
        },
      },
      fontFamily: {
        hebrew: ['Frank Ruhl Libre', 'Heebo', 'Rubik', 'serif'],
        english: ['Playfair Display', 'Cinzel', 'serif'],
      },
    },
  },
  plugins: [],
}
