const preset = require("../../tailwind.preset.js")

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: ["./src/**/*.{ts,tsx}", "./index.html"],
  theme: {
    extend: {}
  },
  plugins: []
}
