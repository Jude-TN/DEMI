/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        charcoal: "#3b3937",
        teal: "#0f9b8b",
        "teal-dark": "#0a6b5f",
        sage: "#dfdec1",
        off: "#faf9f4",
        amber: "#e2b04a",
        "amber-dark": "#a67b1f",
        line: "#e4e2dc",
      },
      fontFamily: {
        display: ["Cormorant Garamond", "serif"],
        sans: ["DM Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
