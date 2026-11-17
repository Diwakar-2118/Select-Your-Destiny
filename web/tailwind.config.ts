import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563EB', 50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8', 800: '#1E40AF' },
        secondary: { DEFAULT: '#6D28D9', 50: '#F5F3FF', 100: '#EDE9FE', 500: '#8B5CF6', 600: '#7C3AED', 700: '#6D28D9' },
        accent: { DEFAULT: '#F97316', 50: '#FFF7ED', 100: '#FFEDD5', 500: '#F97316', 600: '#EA580C' },
        card: '#F3F4F6',
        ink: '#0F172A',
        muted: '#64748B',
        seat: { available: '#22C55E', booked: '#9CA3AF', selected: '#2563EB', ladies: '#EC4899' },
      },
      borderRadius: { xl: '12px', '2xl': '16px', '3xl': '24px' },
      fontFamily: { sans: ['var(--font-inter)', 'system-ui', 'sans-serif'] },
      boxShadow: {
        soft: '0 4px 24px -6px rgba(15,23,42,0.10)',
        lift: '0 12px 40px -12px rgba(37,99,235,0.35)',
        glass: '0 8px 32px 0 rgba(31,38,135,0.15)',
      },
      backgroundImage: {
        brand: 'linear-gradient(135deg,#2563EB 0%,#6D28D9 60%,#F97316 100%)',
        'brand-soft': 'linear-gradient(135deg,rgba(37,99,235,.08) 0%,rgba(109,40,217,.08) 60%,rgba(249,115,22,.08) 100%)',
      },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
      },
      animation: { shimmer: 'shimmer 1.5s infinite', float: 'float 4s ease-in-out infinite' },
    },
  },
  plugins: [],
};
export default config;
