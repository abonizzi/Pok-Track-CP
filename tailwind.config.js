/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0F1B33",
        sidebar: "#0B1530",
        blue: { DEFAULT: "#2F6FED" },
        sky: "#4FA6E8",
        yellow: "#F4C430",
        green: "#22C55E",
        red: "#EF4444",
        amber: "#F5A524"
      },
      borderRadius: { xl2: "18px" }
    }
  },
  plugins: []
};
