/** Colours come from CSS variables set by src/theme/theme-provider.tsx (source: src/theme/tokens.ts). */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: token('background'),
        surface: token('surface'),
        elevated: token('elevated'),
        border: token('border'),
        foreground: token('foreground'),
        muted: token('muted'),
        primary: { DEFAULT: token('primary'), foreground: token('primary-foreground') },
        accent: { DEFAULT: token('accent'), foreground: token('accent-foreground') },
        danger: token('danger'),
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
        display: ['Inter_800ExtraBold'],
        nastaliq: ['NotoNastaliqUrdu_400Regular'],
        'nastaliq-bold': ['NotoNastaliqUrdu_700Bold'],
        deva: ['NotoSansDevanagari_400Regular'],
        'deva-bold': ['NotoSansDevanagari_700Bold'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
