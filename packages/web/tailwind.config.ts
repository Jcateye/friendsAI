import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design tokens from .pen file
        'bg-card': 'var(--bg-card)',
        'bg-page': 'var(--bg-page)',
        'bg-surface': 'var(--bg-surface)',
        border: 'var(--border)',
        primary: 'var(--primary)',
        'primary-tint': 'var(--primary-tint)',
        info: 'var(--info)',
        'info-tint': 'var(--info-tint)',
        warning: 'var(--warning)',
        'warning-tint': 'var(--warning-tint)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        primary: ['Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
    },
  },
  plugins: [],
} satisfies Config
