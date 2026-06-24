/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta tomada del logo: negro profundo + dorado metálico + blanco
        ink: {
          DEFAULT: '#0a0a0f',
          50: '#1a1a22',
          100: '#15151c',
          900: '#050507',
        },
        gold: {
          DEFAULT: '#c9a24b',
          light: '#e8c878',
          dark: '#a67c2e',
          deep: '#7a5a1e',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #7a5a1e 0%, #c9a24b 40%, #e8c878 55%, #c9a24b 70%, #7a5a1e 100%)',
        'ink-radial': 'radial-gradient(circle at 50% 0%, #1a1a22 0%, #0a0a0f 60%)',
      },
      boxShadow: {
        gold: '0 10px 40px -10px rgba(201, 162, 75, 0.45)',
        'gold-sm': '0 4px 20px -6px rgba(201, 162, 75, 0.35)',
        card: '0 10px 30px -12px rgba(0, 0, 0, 0.6)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Animaciones ligeras (solo opacity/transform = aceleradas por GPU)
        'modal-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'overlay-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s ease-out both',
        'modal-in': 'modal-in 0.16s ease-out both',
        'overlay-in': 'overlay-in 0.12s ease-out both',
        shimmer: 'shimmer 3s linear infinite',
      },
    },
  },
  plugins: [],
};
