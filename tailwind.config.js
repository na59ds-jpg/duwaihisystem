/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // هذا هو المفتاح لتغيير الخلفية يدوياً
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}