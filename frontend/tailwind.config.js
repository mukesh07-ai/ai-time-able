/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080B12',
        surface: '#0F1420',
        elevated: '#161C2E',
        border: 'rgba(255,255,255,0.07)',
        primary: '#4F8EF7',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        purple: '#8B5CF6',
        text: {
          primary: '#E8EDF5',
          secondary: '#7B8BA5',
        },
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        dm: ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
        modal: '20px',
      },
      backdropBlur: {
        card: '12px',
      },
    },
  },
  plugins: [],
};
