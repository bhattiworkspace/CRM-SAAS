/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surf: 'var(--surf)',
        surf2: 'var(--surf2)',
        ink: 'var(--ink)',
        mute: 'var(--mute)',
        line: 'var(--line)',
        acc: 'var(--acc)',
        gold: 'var(--gold)',
        up: 'var(--up)',
        down: 'var(--down)',
        sbar: 'var(--sbar)',
        sbarInk: 'var(--sbar-ink)',
        sbarMute: 'var(--sbar-mute)',
        sbarLine: 'var(--sbar-line)',
        tbar: 'var(--tbar)',
        tbarInk: 'var(--tbar-ink)',
        tbarLine: 'var(--tbar-line)',
      },
      fontFamily: {
        head: ['"Barlow Condensed"', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '3px',
      },
    },
  },
  plugins: [],
}
