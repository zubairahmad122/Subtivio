import { z } from 'zod';

/**
 * Output scripts a caption can be shown in. One spoken transcript is stored
 * once with word timings; each script is a per-word rendering of the same
 * words, so toggling scripts never changes timing.
 */
export const ScriptSchema = z.enum(['roman', 'urdu', 'hindi']);
export type Script = z.infer<typeof ScriptSchema>;

export type ScriptInfo = {
  id: Script;
  label: string;
  /** Label written in the script itself, used on the toggle. */
  nativeLabel: string;
  direction: 'ltr' | 'rtl';
  /**
   * Nastaliq stacks diagonally and needs far more vertical room than Latin or
   * Devanagari. Multiply the template font size by this to get line height.
   */
  lineHeight: number;
  /** BCP-47 tag, used for `lang` on web and for accessibility. */
  locale: string;
};

export const SCRIPTS: Record<Script, ScriptInfo> = {
  roman: {
    id: 'roman',
    label: 'Roman Urdu',
    nativeLabel: 'Roman',
    direction: 'ltr',
    lineHeight: 1.25,
    locale: 'ur-Latn',
  },
  urdu: {
    id: 'urdu',
    label: 'Urdu (Nastaliq)',
    nativeLabel: 'اردو',
    direction: 'rtl',
    lineHeight: 2.1,
    locale: 'ur-Arab',
  },
  hindi: {
    id: 'hindi',
    label: 'Hindi',
    nativeLabel: 'हिंदी',
    direction: 'ltr',
    lineHeight: 1.5,
    locale: 'hi-Deva',
  },
};

export const SCRIPT_ORDER: readonly Script[] = ['roman', 'urdu', 'hindi'];
