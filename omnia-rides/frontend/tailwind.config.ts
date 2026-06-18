import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // OMNIA Rides — light "green & white" theme.
        // `white` is remapped to dark slate so all the dim-text / glass
        // (text-white/xx, bg-white/xx, border-white/xx) flip to light-theme
        // correct automatically. Use [#fff] where true white is needed.
        white: '#0f172a',
        ink: {
          950: '#f4faf6',
          900: '#eaf4ee',
          800: '#dcebe1',
          700: '#cfe3d6',
          600: '#bfd9c8',
        },
        accent: {
          DEFAULT: '#16a34a',
          soft: '#15803d',
          deep: '#166534',
        },
        neon: {
          violet: '#16a34a',
          blue: '#15803d',
          pink: '#22c55e',
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
