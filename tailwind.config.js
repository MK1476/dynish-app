/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: '#FDFBF7',
          50: '#FAF8F5',
          100: '#F5EFEB',
          200: '#EDE4DC',
          300: '#DDD0C3',
          400: '#C7B4A3',
        },
        espresso: {
          DEFAULT: '#241E1C',
          50: '#F7F6F5',
          100: '#ECE9E8',
          200: '#D5D0CE',
          300: '#B5ACA8',
          400: '#8C7F7A',
          500: '#6E625D',
          600: '#564C48',
          700: '#433B38',
          800: '#342D2B',
          900: '#241E1C',
          950: '#14100F',
        },
        brand: {
          50: '#FFFDF5',
          100: '#FEF9E7',
          200: '#FDF0C3',
          300: '#FCE496',
          400: '#FAD15F',
          500: '#F5B722',
          600: '#D99706',
          700: '#B47209',
          800: '#92540E',
          900: '#78430F',
          950: '#452203',
        },
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-jakarta)', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(36, 30, 28, 0.05)',
        'card': '0 10px 30px -4px rgba(36, 30, 28, 0.08)',
        'hover': '0 20px 40px -10px rgba(36, 30, 28, 0.12)',
        'glow-gold': '0 0 25px -3px rgba(217, 151, 6, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-subtle': 'pulseSubtle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};
