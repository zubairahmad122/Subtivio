import { DEFAULT_GROUPING, groupIntoLines, type CaptionLine } from './grouping';
import type { Script } from './scripts';
import type { CaptionTemplate } from './templates';
import { wordText, type Word } from './transcript';

/**
 * Font families as libass sees them (family or full name in the TTF). The
 * server ships the same Noto/Inter files the app bundles.
 *
 * `emScale`: libass sizes text by the font's full height (OS/2 winAscent +
 * winDescent) while the app sizes it in ems, so the ASS size is em × this.
 * Nastaliq is very tall, hence 2.5.
 */
type AssFont = { name: string; bold: boolean; emScale: number };
const ASS_FONTS: Record<Script, Record<CaptionTemplate['weight'], AssFont>> = {
  roman: {
    regular: { name: 'Inter SemiBold', bold: false, emScale: 1.43 },
    bold: { name: 'Inter ExtraBold', bold: false, emScale: 1.43 },
  },
  urdu: {
    regular: { name: 'Noto Nastaliq Urdu', bold: false, emScale: 2.5 },
    bold: { name: 'Noto Nastaliq Urdu', bold: true, emScale: 2.5 },
  },
  hindi: {
    regular: { name: 'Noto Sans Devanagari SemiBold', bold: false, emScale: 1.906 },
    bold: { name: 'Noto Sans Devanagari', bold: true, emScale: 1.906 },
  },
};

/** CSS `#RRGGBB` or `rgba(r,g,b,a)` → ASS `&HAABBGGRR` (alpha 00 = opaque). */
export function assColor(css: string): string {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 1;
  const hex = /^#([0-9a-f]{6})$/i.exec(css.trim());
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(
    css.trim(),
  );
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    r = n >> 16;
    g = (n >> 8) & 0xff;
    b = n & 0xff;
  } else if (rgba) {
    r = Number(rgba[1]);
    g = Number(rgba[2]);
    b = Number(rgba[3]);
    a = rgba[4] === undefined ? 1 : Number(rgba[4]);
  }
  const h = (n: number) => Math.round(n).toString(16).padStart(2, '0').toUpperCase();
  return `&H${h(255 - a * 255)}${h(b)}${h(g)}${h(r)}`;
}

function assTime(seconds: number): string {
  const cs = Math.max(0, Math.round(seconds * 100));
  const h = Math.floor(cs / 360_000);
  const m = Math.floor((cs % 360_000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${h}:${pad(m)}:${pad(s)}.${pad(cs % 100)}`;
}

/** Override blocks use { } and \ — strip them from user text. */
function escapeText(text: string): string {
  return text.replace(/[{}\\]/g, '');
}

export type AssOptions = {
  words: readonly Word[];
  script: Script;
  template: CaptionTemplate;
  /** Video size in pixels. */
  width: number;
  height: number;
  watermark: boolean;
};

/**
 * Builds an ASS subtitle file that reproduces a caption template: one event
 * per spoken word, with that word highlighted, so libass renders the same
 * word-by-word animation the app previews. Burn it in with ffmpeg's
 * `subtitles` filter (libass + HarfBuzz shapes Nastaliq and Devanagari).
 */
export function toAss({ words, script, template, width, height, watermark }: AssOptions): string {
  const font = ASS_FONTS[script][template.weight];
  // Stroke, padding and shadow scale with the em size, like the app preview.
  const fontSize = width * template.size;
  const assFontSize = Math.round(fontSize * font.emScale);
  const base = assColor(template.textColor);
  const highlight = assColor(template.highlightColor);
  const strokeWidth = template.stroke ? +(template.stroke.width * fontSize).toFixed(1) : 0;
  const strokeColor = assColor(template.stroke?.color ?? '#000000');

  // A plate is an opaque box (BorderStyle 3) drawn in the outline colour.
  const borderStyle = template.plate ? 3 : 1;
  const outline = template.plate ? +(fontSize * 0.3).toFixed(1) : strokeWidth;
  const outlineColor = template.plate ? assColor(template.plate.color) : strokeColor;
  const shadow = template.shadow ? +(fontSize * 0.04).toFixed(1) : 0;
  const margin = Math.round(width * 0.07);

  const styles = [
    `Style: Caption,${font.name},${assFontSize},${base},${base},${outlineColor},&H80000000,${font.bold ? -1 : 0},0,0,0,100,100,0,0,${borderStyle},${outline},${shadow},5,${margin},${margin},0,1`,
    `Style: Watermark,Inter SemiBold,${Math.round(width * 0.028 * 1.43)},&H33FFFFFF,&H33FFFFFF,&H80000000,&H80000000,0,0,0,0,100,100,0,0,1,${Math.max(1, Math.round(width * 0.002))},0,3,${margin},${margin},${Math.round(height * 0.03)},1`,
  ];

  const lines = groupIntoLines(words, script, { ...DEFAULT_GROUPING, ...template.grouping });
  const x = Math.round(width / 2);
  const y = Math.round(height * template.y);
  const events = lines.flatMap((line) => lineEvents(line));

  function wordMarkup(word: Word, active: boolean): string {
    const raw = escapeText(wordText(word, script));
    const text = template.uppercase && script === 'roman' ? raw.toUpperCase() : raw;
    if (!active) return text;
    switch (template.highlight) {
      case 'color':
        return `{\\c${highlight}}${text}{\\c${base}}`;
      case 'scale':
        return `{\\c${highlight}\\fscx112\\fscy112}${text}{\\c${base}\\fscx100\\fscy100}`;
      case 'underline':
        return `{\\c${highlight}\\u1}${text}{\\c${base}\\u0}`;
      case 'box': {
        const pad = +(fontSize * 0.22).toFixed(1);
        return `{\\3c${highlight}\\bord${pad}}${text}{\\3c${outlineColor}\\bord${outline}}`;
      }
    }
  }

  function lineEvents(line: CaptionLine): string[] {
    return line.words.map((_, i) => {
      const start = i === 0 ? line.start : line.words[i]!.start;
      const end = i === line.words.length - 1 ? line.end : line.words[i + 1]!.start;
      const entrance =
        i !== 0
          ? ''
          : template.entrance === 'pop'
            ? '\\fscx85\\fscy85\\t(0,160,\\fscx100\\fscy100)'
            : template.entrance === 'fade'
              ? '\\fad(200,0)'
              : '';
      const text = line.words.map((w, j) => wordMarkup(w, j === i)).join(' ');
      return `Dialogue: 0,${assTime(start)},${assTime(Math.max(end, start + 0.01))},Caption,,0,0,0,,{\\an5\\pos(${x},${y})${entrance}}${text}`;
    });
  }

  const duration = words.at(-1)?.end ?? 0;
  if (watermark && duration > 0) {
    events.push(
      `Dialogue: 1,${assTime(0)},${assTime(duration + 1)},Watermark,,0,0,0,,Made with Subtivio`,
    );
  }

  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    ...styles,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...events,
    '',
  ].join('\n');
}
