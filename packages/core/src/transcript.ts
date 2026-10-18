import { z } from 'zod';

import { ScriptSchema, type Script } from './scripts';

export const SpokenLanguageSchema = z.enum(['ur', 'hi', 'pa', 'en']);
export type SpokenLanguage = z.infer<typeof SpokenLanguageSchema>;

/**
 * A single spoken word. `text` holds the same word in every script we have
 * produced so far. ASR fills the native script; transliteration fills the
 * rest 1:1, so the word count and timings are identical across scripts.
 */
export const WordSchema = z.object({
  id: z.string(),
  /** Seconds from the start of the video. */
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  confidence: z.number().min(0).max(1).optional(),
  text: z.partialRecord(ScriptSchema, z.string()),
});
export type Word = z.infer<typeof WordSchema>;

export const TranscriptSchema = z.object({
  language: SpokenLanguageSchema,
  words: z.array(WordSchema),
});
export type Transcript = z.infer<typeof TranscriptSchema>;

/** Text for `script`, falling back to whichever script the word does have. */
export function wordText(word: Word, script: Script): string {
  return word.text[script] ?? word.text.roman ?? word.text.urdu ?? word.text.hindi ?? '';
}

export function transcriptDuration(transcript: Transcript): number {
  return transcript.words.at(-1)?.end ?? 0;
}

/** Scripts that every word in the transcript has text for. */
export function availableScripts(transcript: Transcript): Script[] {
  const scripts = ScriptSchema.options;
  return scripts.filter((s) => transcript.words.every((w) => w.text[s] !== undefined));
}
