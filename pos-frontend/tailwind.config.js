/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#14171F',
          soft: '#1D212C',
          faint: '#2A3040',
        },
        surface: '#EEF1F4',
        panel: '#FFFFFF',
        line: '#DCE1E7',
        register: {
          bg: '#0F1218',
          glow: '#5EEAB0',
          dim: '#3A5C4D',
        },
        brand: {
          DEFAULT: '#0F9D6B',
          hover: '#0C7F57',
          soft: '#E4F5EC',
        },
        amber: {
          DEFAULT: '#E2A63B',
          soft: '#FBF1DD',
        },
        danger: {
          DEFAULT: '#D6483F',
          hover: '#B93A32',
          soft: '#FBE9E7',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(20, 23, 31, 0.06), 0 8px 24px -12px rgba(20, 23, 31, 0.15)',
      },
    },
  },
  plugins: [],
}

