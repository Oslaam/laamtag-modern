/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'laam-dark': '#000B17',
        'laam-purple': '#5B2CA0',
        'laam-lime': '#81e757',
        'laam-card': '#0a1625',
        'laam-border': '#1e3a5f',
      },
      fontFamily: {
        'mea-culpa': ['"Mea Culpa"', 'cursive'],
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        solana: {
          "primary": "#81e757", // Your lime green
          "secondary": "#5B2CA0", // Your purple
          "accent": "#81e757",
          "neutral": "#1e3a5f",
          "base-100": "#000B17", // Your dark background
          "info": "#2094f3",
          "success": "#009485",
          "warning": "#ff9900",
          "error": "#ff5724",
        },
      },
    ],
  },
}