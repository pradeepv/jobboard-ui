// tailwind.config.mjs
/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./src/**/*.{js,jsx,ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: { brand: "#2563eb" },
      spacing: { 13: "3.25rem", 97: "24.25rem" }, // unique
      borderRadius: { xl2: "1rem" },
    },
  },
  plugins: [],
};
export default config;