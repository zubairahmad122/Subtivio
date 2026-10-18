import type { GroupingOptions } from './grouping';

/**
 * A caption template is pure data. The app's live preview (React Native) and
 * the export renderer (Remotion on the worker) both read the same spec, so a
 * template looks the same on the phone and in the final MP4.
 */
export type HighlightMode =
  /** Active word changes colour. */
  | 'color'
  /** Active word sits on a filled rounded box. */
  | 'box'
  /** Active word grows slightly and changes colour. */
  | 'scale'
  /** Active word gets a thick underline. */
  | 'underline';

export type TemplateCategory =
  'essentials' | 'news' | 'cricket' | 'islamic' | 'motivational' | 'property' | 'ecommerce';

export type CaptionTemplate = {
  id: string;
  name: string;
  category: TemplateCategory;
  tier: 'free' | 'pro';
  /** Font size as a fraction of video width, so it scales to any resolution. */
  size: number;
  weight: 'regular' | 'bold';
  textColor: string;
  highlightColor: string;
  highlight: HighlightMode;
  /** Optional plate behind the whole line. */
  plate?: { color: string; radius: number };
  stroke?: { color: string; width: number };
  shadow: boolean;
  /** Only applied to Latin script; Urdu and Hindi have no case. */
  uppercase: boolean;
  /** Vertical centre of the caption as a fraction of video height. */
  y: number;
  entrance: 'pop' | 'fade' | 'none';
  grouping?: Partial<GroupingOptions>;
};

export const TEMPLATES: readonly CaptionTemplate[] = [
  {
    id: 'lafz',
    name: 'Lafz',
    category: 'essentials',
    tier: 'free',
    size: 0.072,
    weight: 'bold',
    textColor: '#FFFFFF',
    highlightColor: '#F4B740',
    highlight: 'color',
    stroke: { color: '#000000', width: 0.08 },
    shadow: true,
    uppercase: false,
    y: 0.68,
    entrance: 'pop',
  },
  {
    id: 'saaf',
    name: 'Saaf',
    category: 'essentials',
    tier: 'free',
    size: 0.06,
    weight: 'regular',
    textColor: 'rgba(255,255,255,0.55)',
    highlightColor: '#FFFFFF',
    highlight: 'color',
    shadow: true,
    uppercase: false,
    y: 0.78,
    entrance: 'fade',
    grouping: { maxWords: 6, maxChars: 30 },
  },
  {
    id: 'breaking',
    name: 'Breaking',
    category: 'news',
    tier: 'free',
    size: 0.064,
    weight: 'bold',
    textColor: '#FFFFFF',
    highlightColor: '#FACC15',
    highlight: 'color',
    plate: { color: '#B91C1C', radius: 0.01 },
    shadow: false,
    uppercase: true,
    y: 0.8,
    entrance: 'none',
  },
  {
    id: 'pitch',
    name: 'Pitch',
    category: 'cricket',
    tier: 'pro',
    size: 0.074,
    weight: 'bold',
    textColor: '#FFFFFF',
    highlightColor: '#16A34A',
    highlight: 'box',
    stroke: { color: '#052E16', width: 0.06 },
    shadow: true,
    uppercase: true,
    y: 0.7,
    entrance: 'pop',
  },
  {
    id: 'noor',
    name: 'Noor',
    category: 'islamic',
    tier: 'pro',
    size: 0.066,
    weight: 'regular',
    textColor: '#FBF6E9',
    highlightColor: '#E9C46A',
    highlight: 'color',
    shadow: true,
    uppercase: false,
    y: 0.62,
    entrance: 'fade',
    grouping: { maxWords: 5, maxChars: 26 },
  },
  {
    id: 'josh',
    name: 'Josh',
    category: 'motivational',
    tier: 'pro',
    size: 0.09,
    weight: 'bold',
    textColor: '#FFFFFF',
    highlightColor: '#FDE047',
    highlight: 'scale',
    stroke: { color: '#000000', width: 0.1 },
    shadow: true,
    uppercase: true,
    y: 0.6,
    entrance: 'pop',
    grouping: { maxWords: 2, maxChars: 14 },
  },
  {
    id: 'plot',
    name: 'Plot',
    category: 'property',
    tier: 'pro',
    size: 0.062,
    weight: 'bold',
    textColor: '#FFFFFF',
    highlightColor: '#E9B949',
    highlight: 'underline',
    plate: { color: 'rgba(15,23,42,0.88)', radius: 0.02 },
    shadow: false,
    uppercase: false,
    y: 0.76,
    entrance: 'fade',
  },
  {
    id: 'bazaar',
    name: 'Bazaar',
    category: 'ecommerce',
    tier: 'pro',
    size: 0.07,
    weight: 'bold',
    textColor: '#FFFFFF',
    highlightColor: '#EC4899',
    highlight: 'box',
    stroke: { color: '#000000', width: 0.06 },
    shadow: true,
    uppercase: false,
    y: 0.7,
    entrance: 'pop',
  },
];

export function getTemplate(id: string): CaptionTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]!;
}
