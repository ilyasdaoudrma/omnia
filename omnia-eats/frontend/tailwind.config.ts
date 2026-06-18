import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // OMNIA Eats — light "orange with green/white" theme. `white` is remapped
        // to dark slate so dim-text / glass utilities flip to light automatically.
        // Use [#fff] where true white is needed.
        white: '#0f172a',
        ink: {
          950: '#fff8f3',
          900: '#fff1e8',
          800: '#ffe7d7',
          700: '#ffdcc6',
          600: '#ffd0b5',
        },
        accent: {
          DEFAULT: '#ea580c',
          soft: '#c2410c',
          deep: '#9a3412',
        },
        neon: {
          violet: '#ea580c',
          blue: '#c2410c',
          pink: '#16a34a',
          cyan: '#86efac',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'Cambria', 'serif'],
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
