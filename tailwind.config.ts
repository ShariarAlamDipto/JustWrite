import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ── JustWrite Design Tokens ────────────────────────────────────────────
      colors: {
        // Canvas — main background surfaces
        canvas: {
          light: '#F7F6F2',   // warm off-white
          dark:  '#131313',   // graphite black
        },
        surface: {
          light: '#EFEDE8',   // elevated surface (light)
          dark:  '#1C1C1C',   // elevated surface (dark)
        },
        card: {
          light: '#FFFFFF',
          dark:  '#242424',
        },
        border: {
          light: '#E8E5DF',
          dark:  '#2E2E2E',
        },
        ink: {
          DEFAULT: '#1A1A1A',
          light:   '#F2F0EB',
          dim:     { light: '#6B6962', dark: '#8A8882' },
        },
        muted: {
          light: '#9E9B96',
          dark:  '#636060',
        },
        // ── Segment accent strips (very subtle, used as dots + borders) ──
        journal: {
          DEFAULT: '#C9A97A',   // warm amber
          bg:      '#F9F4EC',   // light tinted bg
          dark:    '#9B7C4F',
        },
        ideas: {
          DEFAULT: '#7EB8A0',   // sage green
          bg:      '#EDF6F2',
          dark:    '#4F8F78',
        },
        notes: {
          DEFAULT: '#7EA8C4',   // dusty blue
          bg:      '#EDF3F9',
          dark:    '#4F7A9B',
        },
        connect: {
          DEFAULT: '#B47EA8',   // soft mauve
          bg:      '#F6EDF6',
          dark:    '#855B7B',
        },
        // ── State tokens ──────────────────────────────────────────────────
        private: {
          DEFAULT: '#E0B877',   // warm gold — privacy indicator
          bg:      '#FDF6E7',
          dark:    '#A88240',
        },
        voice: {
          DEFAULT: '#D47878',   // soft coral — recording state
          bg:      '#FDEAEA',
          dark:    '#A84F4F',
        },
      },

      // ── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        sans:  ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
        serif: ['Georgia', 'Charter', 'Times New Roman', 'serif'],
        mono:  ['SF Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs':   ['0.625rem', { lineHeight: '1rem' }],
        xs:      ['0.75rem',  { lineHeight: '1.125rem', letterSpacing: '0.01em' }],
        sm:      ['0.875rem', { lineHeight: '1.375rem' }],
        base:    ['1rem',     { lineHeight: '1.65rem' }],
        lg:      ['1.125rem', { lineHeight: '1.75rem' }],
        xl:      ['1.25rem',  { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        '2xl':   ['1.5rem',   { lineHeight: '1.875rem', letterSpacing: '-0.015em' }],
        '3xl':   ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        display: ['2.25rem',  { lineHeight: '1.15', letterSpacing: '-0.025em' }],
      },

      // ── Spacing ───────────────────────────────────────────────────────────
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top':    'env(safe-area-inset-top)',
        'nav':         '56px',   // bottom nav height
        'topbar':      '52px',   // top bar height
      },

      // ── Border radius ─────────────────────────────────────────────────────
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
        '5xl': '40px',
      },

      // ── Box shadow ────────────────────────────────────────────────────────
      boxShadow: {
        'card-light': '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)',
        'card-dark':  '0 1px 3px rgba(0,0,0,0.3)',
        'sheet':      '0 -8px 40px rgba(0,0,0,0.12)',
        'sheet-dark': '0 -8px 40px rgba(0,0,0,0.5)',
        'fab':        '0 4px 20px rgba(0,0,0,0.15)',
        'fab-dark':   '0 4px 20px rgba(0,0,0,0.4)',
      },

      // ── Animation ─────────────────────────────────────────────────────────
      transitionTimingFunction: {
        spring:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth:  'cubic-bezier(0.4, 0, 0.2, 1)',
        decel:   'cubic-bezier(0, 0, 0.2, 1)',
      },
      keyframes: {
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up-sheet': {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%':      { transform: 'scale(1.15)', opacity: '0.3' },
        },
        'recording-dot': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.3' },
        },
      },
      animation: {
        'slide-up':       'slide-up 0.22s cubic-bezier(0, 0, 0.2, 1) forwards',
        'slide-up-sheet': 'slide-up-sheet 0.3s cubic-bezier(0, 0, 0.2, 1) forwards',
        'fade-in':        'fade-in 0.18s ease forwards',
        'scale-in':       'scale-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'pulse-ring':     'pulse-ring 1.5s ease-in-out infinite',
        'recording-dot':  'recording-dot 1s ease-in-out infinite',
      },
    },
  },
  corePlugins: {
    preflight: false, // Don't override existing CSS reset
  },
  plugins: [],
}

export default config
