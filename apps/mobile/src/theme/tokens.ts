/**
 * Lafz design tokens: "Ink & Saffron".
 *
 * Warm near-black ink, a saffron-gold primary (the caption highlight colour
 * creators will see on every export) and an emerald accent. Dark is the hero
 * theme; light uses warm paper instead of pure white.
 *
 * This file is the single source of truth. Colours are injected as CSS
 * variables (see ThemeProvider) and Tailwind reads them in tailwind.config.js,
 * so `bg-primary` and `useTheme().colors.primary` can never drift apart.
 */
type Rgb = readonly [number, number, number];

export type ColorToken =
  | 'background'
  | 'surface'
  | 'elevated'
  | 'border'
  | 'foreground'
  | 'muted'
  | 'primary'
  | 'primary-foreground'
  | 'accent'
  | 'accent-foreground'
  | 'danger';

const dark: Record<ColorToken, Rgb> = {
  background: [11, 10, 9],
  surface: [20, 19, 17],
  elevated: [30, 28, 25],
  border: [44, 41, 37],
  foreground: [246, 242, 234],
  muted: [156, 150, 140],
  primary: [244, 183, 64],
  'primary-foreground': [26, 18, 6],
  accent: [52, 211, 153],
  'accent-foreground': [3, 26, 18],
  danger: [248, 113, 113],
};

const light: Record<ColorToken, Rgb> = {
  background: [250, 247, 241],
  surface: [255, 255, 255],
  elevated: [242, 237, 228],
  border: [229, 222, 210],
  foreground: [22, 19, 15],
  muted: [111, 104, 94],
  primary: [233, 169, 46],
  'primary-foreground': [26, 18, 6],
  accent: [5, 150, 105],
  'accent-foreground': [255, 255, 255],
  danger: [220, 38, 38],
};

export type Scheme = 'light' | 'dark';

const toHex = ([r, g, b]: Rgb) =>
  `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;

function mapPalettes<K extends string, V>(
  key: (token: ColorToken) => K,
  value: (rgb: Rgb) => V,
): Record<Scheme, Record<K, V>> {
  const build = (palette: Record<ColorToken, Rgb>) =>
    Object.fromEntries(
      (Object.entries(palette) as [ColorToken, Rgb][]).map(([k, v]) => [key(k), value(v)]),
    ) as Record<K, V>;
  return { light: build(light), dark: build(dark) };
}

/** Hex colours for places that need a plain string (icons, gradients, native headers). */
export const colors = mapPalettes((k) => k, toHex);

/** CSS variables in the `R G B` form Tailwind's `<alpha-value>` expects. */
export const cssVariables = mapPalettes(
  (k) => `--${k}` as const,
  (v) => v.join(' '),
);
