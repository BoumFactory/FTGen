/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        marine: {
          DEFAULT: "rgb(var(--marine-600) / <alpha-value>)",
          50:  "rgb(var(--marine-50) / <alpha-value>)",
          100: "rgb(var(--marine-100) / <alpha-value>)",
          200: "rgb(var(--marine-200) / <alpha-value>)",
          300: "rgb(var(--marine-300) / <alpha-value>)",
          400: "rgb(var(--marine-400) / <alpha-value>)",
          500: "rgb(var(--marine-500) / <alpha-value>)",
          600: "rgb(var(--marine-600) / <alpha-value>)",
          700: "rgb(var(--marine-700) / <alpha-value>)",
          800: "rgb(var(--marine-800) / <alpha-value>)",
          900: "rgb(var(--marine-900) / <alpha-value>)",
        },
        or: {
          DEFAULT: "rgb(var(--or-500) / <alpha-value>)",
          50:  "rgb(var(--or-50) / <alpha-value>)",
          100: "rgb(var(--or-100) / <alpha-value>)",
          200: "rgb(var(--or-200) / <alpha-value>)",
          300: "rgb(var(--or-300) / <alpha-value>)",
          400: "rgb(var(--or-400) / <alpha-value>)",
          500: "rgb(var(--or-500) / <alpha-value>)",
          600: "rgb(var(--or-600) / <alpha-value>)",
          700: "rgb(var(--or-700) / <alpha-value>)",
          800: "rgb(var(--or-800) / <alpha-value>)",
          900: "rgb(var(--or-900) / <alpha-value>)",
        },
        creme: {
          DEFAULT: "rgb(var(--creme-200) / <alpha-value>)",
          50:  "rgb(var(--creme-50) / <alpha-value>)",
          100: "rgb(var(--creme-100) / <alpha-value>)",
          200: "rgb(var(--creme-200) / <alpha-value>)",
          300: "rgb(var(--creme-300) / <alpha-value>)",
          400: "rgb(var(--creme-400) / <alpha-value>)",
        },
        muted:       "rgb(var(--muted) / <alpha-value>)",
        "muted-light": "rgb(var(--muted-light) / <alpha-value>)",
        "muted-dark":  "rgb(var(--muted-dark) / <alpha-value>)",
        "muted-blue":  "rgb(var(--muted-blue) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderWidth: {
        3: "3px",
      },
    },
  },
  plugins: [],
};
