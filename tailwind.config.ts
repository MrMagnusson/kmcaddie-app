import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#78dc77',
        'on-primary': '#00390a',
        'primary-container': '#127f27',
        'on-primary-container': '#95f990',
        secondary: '#54db8b',
        'secondary-container': '#1a5c35',
        'on-secondary-container': '#d6ffa5',
        surface: '#121412',
        'surface-low': '#1a1c1a',
        'surface-mid': '#1e201e',
        'surface-high': '#292a28',
        'surface-highest': '#333533',
        'on-surface': '#e2e3e0',
        'on-variant': '#c1c9be',
        'outline-v': '#404940',
        error: '#ffb4ab',
        'error-container': '#93000a',
      },
      fontFamily: {
        display: ['Lexend', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
