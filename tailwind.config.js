/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#FFF7ED', 100: '#FFEDD5', 200: '#FED7AA', 300: '#FDBA74',
          400: '#FB923C', 500: '#F97316', 600: '#EA580C', 700: '#C2410C',
          800: '#9A3412', 900: '#7C2D12',
        },
        ink: {
          50: '#F8F8F8', 100: '#F1F1F1', 200: '#E4E4E4', 300: '#CBCBCB',
          400: '#A0A0A0', 500: '#717171', 600: '#4E4E4E', 700: '#3D3D3D',
          800: '#2D2D2D', 900: '#1A1A1A', 950: '#0D0D0D',
        },
        success: { 50: '#F0FDF4', 100: '#DCFCE7', 500: '#22C55E', 600: '#16A34A', 700: '#15803D' },
        warning: { 50: '#FFFBEB', 500: '#F59E0B', 600: '#D97706', 700: '#92400E' },
        danger:  { 50: '#FEF2F2', 200: '#FECACA', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C' },
        info:    { 50: '#EFF6FF', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,.04), 0 6px 16px rgba(0,0,0,.06)',
        card: '0 2px 4px rgba(0,0,0,.05), 0 12px 32px rgba(0,0,0,.08)',
        pop:  '0 8px 32px rgba(249,115,22,.35)',
      },
      borderRadius: {
        '2xl': '1rem', '3xl': '1.5rem', '4xl': '2rem',
      },
      keyframes: {
        'fade-up':    { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in':    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-out':   { '0%': { opacity: '1' }, '100%': { opacity: '0' } },
        'scale-in':   { '0%': { opacity: '0', transform: 'scale(.94)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'slide-up':   { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        'slide-down': { '0%': { transform: 'translateY(0)' }, '100%': { transform: 'translateY(100%)' } },
        shimmer:      { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
      },
      animation: {
        'fade-up':    'fade-up .4s ease-out both',
        'fade-in':    'fade-in .3s ease-out both',
        'fade-out':   'fade-out .2s ease-in both',
        'scale-in':   'scale-in .28s ease-out both',
        'slide-up':   'slide-up .35s cubic-bezier(.32,.72,0,1) both',
        'slide-down': 'slide-down .25s cubic-bezier(.32,.72,0,1) both',
        shimmer:      'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
