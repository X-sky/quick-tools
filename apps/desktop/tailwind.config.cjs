const preset = require("../../tailwind.preset.js")

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: ["./src/**/*.{ts,tsx}", "./index.html"],
  theme: {
    extend: {
      colors: {
        stone: {
          750: "#3a3532",
          850: "#231f1d"
        }
      }
    }
  },
  plugins: []
}
