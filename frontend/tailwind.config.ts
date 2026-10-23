import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#E11D2E',
          dark: '#B3121F',
          light: '#FDE8EA',
        },
        ink: '#0F172A',
        muted: '#64748B',
        canvas: '#F4F5F7',
      },
      fontFamily: {
        sans: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        kiosk: '0 10px 30px -12px rgba(15, 23, 42, 0.18)',
        card: '0 16px 40px -20px rgba(15, 23, 42, 0.35)',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        pulseSoft: 'pulseSoft 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
