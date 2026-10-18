import { z } from 'zod';

import { ScriptSchema, type Script } from './scripts';
import type { Word } from './transcript';

/**
 * A creator's preferred spelling, e.g. "he" -> "hai" or "kia" -> "kya".
 * This is the personal layer on top of the LLM normalisation pass, and the
 * main reason Roman Urdu output feels "right" to a given creator.
 */
export const SpellingRuleSchema = z.object({
  script: ScriptSchema,
  from: z.string().min(1),
  to: z.string().min(1),
});
export type SpellingRule = z.infer<typeof SpellingRuleSchema>;

const EDGE_PUNCTUATION = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u;

/**
 * Applies whole-word spelling rules to one script of the transcript.
 * Matching ignores case and surrounding punctuation; timings never change.
 */
export function applySpellingRules(
  words: readonly Word[],
  rules: readonly SpellingRule[],
  script: Script,
): Word[] {
  const lookup = new Map(
    rules.filter((r) => r.script === script).map((r) => [r.from.toLocaleLowerCase(), r.to]),
  );
  if (lookup.size === 0) return [...words];

  return words.map((word) => {
    const original = word.text[script];
    if (original === undefined) return word;

    const [, lead = '', core = '', trail = ''] = EDGE_PUNCTUATION.exec(original) ?? [];
    const replacement = lookup.get(core.toLocaleLowerCase());
    if (replacement === undefined) return word;

    return { ...word, text: { ...word.text, [script]: `${lead}${replacement}${trail}` } };
  });
}
