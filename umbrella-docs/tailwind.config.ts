import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            '--tw-prose-body': 'rgb(0 0 0)',
            '--tw-prose-headings': 'rgb(0 0 0)',
            '--tw-prose-links': 'rgb(0 0 0)',
            '--tw-prose-bold': 'rgb(0 0 0)',
            '--tw-prose-code': 'rgb(0 0 0)',
            '--tw-prose-pre-bg': 'rgb(250 250 250)',
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
