/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        app: 'var(--bg-app)',
        sidebar: 'var(--bg-sidebar)',
        topbar: 'var(--bg-topbar)',
        surface: 'var(--bg-surface)',
        active: 'var(--bg-active)',
        border: 'var(--border)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        dim: 'var(--text-dim)',
      },
    },
  },
  plugins: [],
};

