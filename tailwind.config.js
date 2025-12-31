/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // ADD THIS LINE: It tells Tailwind to scan the src folder
    "./pages/**/*.{js,ts,jsx,tsx}",
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