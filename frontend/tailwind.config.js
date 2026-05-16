/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: 'var(--primary-color)',
        ink: 'var(--secondary-color)',
        accent: 'var(--accent-color)'
      }
    }
  },
  plugins: []
};

