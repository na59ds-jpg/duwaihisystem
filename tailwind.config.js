/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // هذا هو المفتاح لتغيير الخلفية يدوياً
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: '#C4B687',
        black: '#000000',
        success: '#10B981', // Emerald 500 for explicit approval
        error: '#EF4444',   // Red 500 for explicit rejection
      }
    },
  },
  plugins: [],
}