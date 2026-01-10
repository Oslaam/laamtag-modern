/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",    // Specifically targets _app.tsx
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",          // Catch-all for src folder
    "./pages/**/*.{js,ts,jsx,tsx}",        // Legacy support
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'laam-green': '#81e757',
        'laam-dark': '#000B17',
      },
    },
  },
  plugins: [],
}