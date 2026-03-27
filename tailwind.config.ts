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
          light: '#fafafa',
          dark:  '#0d0d0d',
        },
        surface: {
          light: '#EFEDE8',   // elevated surface (light)
          dark:  '#1C1C1C',   // elevated surface (dark)
        },
        card: {
          light: '#ffffff',
          dark:  '#1a1a1a',
        },
        border: {
          light: '#e5e5e5',
          dark:  '#2a2a2a',
        },
        ink: {
          DEFAULT: '#1a1a1a',
          light:   '#f5f5f5',
          dim:     { light: '#525252', dark: '#a0a0a0' },
        },
        muted: {
          light: '#9ca3af',
          dark:  '#666666',
        },
        // ── Segment accent strips (blue — single accent color) ──
        journal: {
          DEFAULT: '#3182ce',
          bg:      'rgba(49,130,206,0.06)',
          dark:    '#2c5282',
        },
        ideas: {
          DEFAULT: '#4299e1',
          bg:      'rgba(66,153,225,0.06)',
          dark:    '#2b6cb0',
        },
        notes: {
          DEFAULT: '#63b3ed',
          bg:      'rgba(99,179,237,0.06)',
          dark:    '#2c5282',
        },
        connect: {
          DEFAULT: '#3182ce',
          bg:      'rgba(49,130,206,0.06)',
          dark:    '#2c5282',
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
