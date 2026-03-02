/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        toms: {
          bg: '#F9FAFB',
          blue: '#257BFF',
          'blue-light': '#E6F0FF',
          'gray-label': '#374151',
          'gray-muted': '#6B7280',
          'gray-border': '#E5E7EB',
          'gray-placeholder': '#9CA3AF',
        },
      },
    },
  },
  plugins: [],
}
