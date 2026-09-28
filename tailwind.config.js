/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fc',
          400: '#36a9f7',
          500: '#0c8de4',
          600: '#0270c1',
          700: '#03599d',
          800: '#074c81',
          900: '#0c406c',
          950: '#082847',
        },
        sidebar: {
          bg: '#0f172a',
          fg: '#94a3b8',
          hover: '#1e293b',
          active: '#334155',
          textActive: '#f8fafc',
          border: '#1e293b',
        }
      },
    },
  },
  plugins: [],
}
