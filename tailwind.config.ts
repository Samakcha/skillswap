import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        xs: '375px',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Syne', 'sans-serif'],
        mono: ['var(--font-mono)', 'Space Mono', 'monospace'],
        sans: ['var(--font-sans)', 'Syne', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
