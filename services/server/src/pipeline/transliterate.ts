import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { Script, Word } from '@subtivio/core';
import { z } from 'zod';

import { env } from '../env';

const CHUNK = 120;

const SYSTEM = `You transliterate spoken South Asian speech for video captions.
You receive a numbered list of words from one transcript, in the order spoken. They may be Urdu, Hindi, Punjabi or English, often mixed in one sentence.
For every input word, write that same word in three scripts:
- roman: Roman Urdu as Pakistani creators type it on Instagram and TikTok (e.g. "hai", "kya", "nahi", "yaar", "main", "aap"). English words stay in normal English spelling.
- urdu: Urdu in Arabic script (Nastaliq). English words are written phonetically in Urdu script.
- hindi: Devanagari. English words are written phonetically in Devanagari.
Transliterate, never translate. Keep punctuation attached to the word it follows.
Each output array must have exactly one entry per input word, in the same order — never merge, split, add or drop words.`;

const Output = z.object({
  roman: z.array(z.string()),
  urdu: z.array(z.string()),
  hindi: z.array(z.string()),
});

let client: Anthropic | undefined;

async function convertChunk(texts: string[]): Promise<z.infer<typeof Output> | undefined> {
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join('\n');

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await client.messages.parse({
      model: env.TRANSLIT_MODEL,
      max_tokens: 16000,
      // Word-by-word transliteration is simple; low effort keeps it fast and cheap.
      output_config: { effort: 'low', format: zodOutputFormat(Output) },
      system: SYSTEM,
      messages: [{ role: 'user', content: `${texts.length} words:\n${numbered}` }],
    });
    if (response.stop_reason === 'refusal') return undefined;

    const out = response.parsed_output;
    if (
      out &&
      out.roman.length === texts.length &&
      out.urdu.length === texts.length &&
      out.hindi.length === texts.length
    ) {
      return out;
    }
    // Word counts drifted: retry once, then leave this chunk in its native script.
  }
  return undefined;
}

export type TransliterateResult = { words: Word[]; complete: boolean };

/**
 * Fills in the missing scripts for every word, 1:1, so the app's script
 * toggle never changes timings. Without an Anthropic key, or if a chunk
 * fails, words keep only the script the ASR produced.
 */
export async function transliterate(
  words: readonly Word[],
  nativeScript: Script,
): Promise<TransliterateResult> {
  if (!env.ANTHROPIC_API_KEY) return { words: [...words], complete: false };

  const result = [...words];
  let complete = true;

  for (let start = 0; start < words.length; start += CHUNK) {
    const chunk = words.slice(start, start + CHUNK);
    const texts = chunk.map((w) => w.text[nativeScript] ?? '');
    try {
      const out = await convertChunk(texts);
      if (!out) {
        complete = false;
        continue;
      }
      chunk.forEach((word, i) => {
        result[start + i] = {
          ...word,
          // The ASR text stays authoritative for its own script.
          text: { roman: out.roman[i], urdu: out.urdu[i], hindi: out.hindi[i], ...word.text },
        };
      });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError)
        throw new Error('ANTHROPIC_API_KEY is invalid.');
      if (error instanceof Anthropic.APIError) {
        console.warn(`Transliteration chunk failed (${error.status}): ${error.message}`);
        complete = false;
        continue;
      }
      throw error;
    }
  }
  return { words: result, complete };
}
