/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace"
        ],
        /* Design Token fonts — use via font-dt-sans / font-dt-mono */
        "dt-sans": ["Geist", "system-ui", "sans-serif"],
        "dt-mono": ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        /* Design Token modular scale — use via text-dt-2xs etc. */
        "dt-2xs": ["11px", { lineHeight: "16px" }],
        "dt-xs": ["14px", { lineHeight: "20px" }],
        "dt-sm": ["17.5px", { lineHeight: "24px" }],
        "dt-base": ["22px", { lineHeight: "28px" }],
        "dt-lg": ["27.5px", { lineHeight: "36px" }],
      },
      colors: {
        brand: {
          50: "#fff1f2",
          100: "#ffe4e6",
          200: "#fecdd3",
          300: "#fda4af",
          400: "#fb7185",
          500: "#f43f5e",
          600: "#e11d48",
          700: "#be123c",
          800: "#9f1239",
          900: "#881337",
          950: "#4c0519"
        },
        /* Design Token warm neutral — use via bg-dt-neutral-50 etc. */
        "dt-neutral": {
          50: "var(--neutral-50, hsl(40, 6%, 97%))",
          100: "var(--neutral-100, hsl(40, 5%, 93%))",
          200: "var(--neutral-200, hsl(40, 5%, 86%))",
          300: "var(--neutral-300, hsl(40, 4%, 74%))",
          400: "var(--neutral-400, hsl(40, 4%, 58%))",
          500: "var(--neutral-500, hsl(40, 4%, 45%))",
          600: "var(--neutral-600, hsl(40, 4%, 35%))",
          700: "var(--neutral-700, hsl(40, 5%, 26%))",
          800: "var(--neutral-800, hsl(40, 5%, 18%))",
          900: "var(--neutral-900, hsl(40, 5%, 11%))",
          950: "var(--neutral-950, hsl(40, 6%, 7%))",
        },
        /* Design Token brand rose — use via bg-dt-brand-500 etc. */
        "dt-brand": {
          50: "var(--brand-50, hsl(350, 55%, 97%))",
          100: "var(--brand-100, hsl(350, 52%, 93%))",
          200: "var(--brand-200, hsl(350, 55%, 85%))",
          300: "var(--brand-300, hsl(350, 58%, 74%))",
          400: "var(--brand-400, hsl(350, 58%, 63%))",
          500: "var(--brand-500, hsl(350, 55%, 50%))",
          600: "var(--brand-600, hsl(350, 55%, 44%))",
          700: "var(--brand-700, hsl(350, 52%, 36%))",
          800: "var(--brand-800, hsl(350, 48%, 28%))",
          900: "var(--brand-900, hsl(350, 45%, 22%))",
          950: "var(--brand-950, hsl(350, 40%, 14%))",
        },
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
        128: "32rem"
      },
      borderRadius: {
        "2xl": "1rem",
        /* Design Token radii — use via rounded-dt-xs etc. */
        "dt-xs": "3px",
        "dt-sm": "6px",
        "dt-md": "10px",
        "dt-lg": "14px",
        "dt-xl": "20px",
      },
      boxShadow: {
        /* Design Token warm-tinted shadows — use via shadow-dt-surface etc. */
        "dt-surface": "0 1px 2px hsla(40, 10%, 20%, 0.04)",
        "dt-raised": "0 2px 8px hsla(40, 10%, 20%, 0.06)",
        "dt-overlay": "0 8px 24px hsla(40, 10%, 20%, 0.1)",
        "dt-modal": "0 16px 48px hsla(40, 10%, 20%, 0.16)",
      },
      transitionDuration: {
        /* Design Token durations — use via duration-dt-instant etc. */
        "dt-instant": "100ms",
        "dt-fast": "200ms",
        "dt-normal": "300ms",
        "dt-slow": "500ms",
      },
      transitionTimingFunction: {
        /* Design Token easing — use via ease-dt-smooth */
        "dt-smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      animation: {
        in: "enter 0.2s ease-out",
        "fade-in": "fadeIn 0.3s ease-out"
      },
      keyframes: {
        enter: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        }
      }
    }
  }
}
