import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark, futuristic base with purple/neon accents.
        ink: {
          950: '#050505',
          900: '#0b0a08',
          800: '#14120e',
          700: '#1c1915',
          600: '#242018',
        },
        accent: {
          DEFAULT: '#d4af37',
          soft: '#e8cf8a',
          deep: '#9a7b1e',
        },
        neon: {
          violet: '#d4af37',
          blue: '#c9a227',
          pink: '#f1d98a',
          cyan: '#f3ecd6',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        hero: ['clamp(3rem, 1rem + 7vw, 8rem)', { lineHeight: '0.95', letterSpacing: '-0.04em' }],
        'display-lg': ['clamp(2.25rem, 1rem + 4vw, 4.5rem)', { lineHeight: '1.02', letterSpacing: '-0.03em' }],
      },
      spacing: {
        section: 'clamp(4rem, 3rem + 5vw, 10rem)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionTimingFunction: {
        expo: 'cubic-bezier(0.16, 1, 0.3, 1)',
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'aurora-shift': {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(4%, -3%, 0) scale(1.15)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.7' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
      },
      animation: {
        'aurora-shift': 'aurora-shift 18s ease-in-out infinite',
        marquee: 'marquee 32s linear infinite',
        'pulse-ring': 'pulse-ring 2.4s ease-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
