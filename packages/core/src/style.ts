import { z } from 'zod';

import type { CaptionTemplate } from './templates';

/**
 * Per-project adjustments layered on the chosen template. Kept separate so
 * switching template keeps the user's position, size and colours.
 */
export const StyleSchema = z.object({
  /** Vertical centre as a fraction of video height (0 = top, 1 = bottom). */
  y: z.number().min(0.1).max(0.9).optional(),
  /** Multiplier on the template's font size. */
  sizeScale: z.number().min(0.6).max(1.6).optional(),
  textColor: z.string().optional(),
  highlightColor: z.string().optional(),
  uppercase: z.boolean().optional(),
  /** Words per caption line. */
  maxWords: z.number().int().min(1).max(8).optional(),
});
export type Style = z.infer<typeof StyleSchema>;

/** The template the preview and the export actually draw. */
export function applyStyle(template: CaptionTemplate, style: Style = {}): CaptionTemplate {
  return {
    ...template,
    y: style.y ?? template.y,
    size: template.size * (style.sizeScale ?? 1),
    textColor: style.textColor ?? template.textColor,
    highlightColor: style.highlightColor ?? template.highlightColor,
    uppercase: style.uppercase ?? template.uppercase,
    grouping:
      style.maxWords === undefined
        ? template.grouping
        : // More words per line need more characters too.
          {
            ...template.grouping,
            maxWords: style.maxWords,
            maxChars: Math.max(14, style.maxWords * 7),
          },
  };
}
