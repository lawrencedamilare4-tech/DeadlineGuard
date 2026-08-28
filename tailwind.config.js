/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        shamrock: {
          DEFAULT: '#4db372',
          light: '#6fbf8c',
          lighter: '#a8d5b9',
          dark: '#2f8f5b',
          darker: '#1f472e',
          darkest: '#0b1910',
        },
        storm: {
          warning: '#ffd166',
          critical: '#ef476f',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};