import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { Script, Word } from '@subtivio/core';
import { z } from 'zod';

import { env } from '../env';
import { FatalError, gemini as geminiClient, geminiPool } from './gemini';

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
type Output = z.infer<typeof Output>;

const userPrompt = (texts: string[]) =>
  `${texts.length} words:\n${texts.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;

/**
 * One request to a model. Returns undefined when the model declines; throws
 * `FatalError` for problems retrying cannot fix (a bad key), anything else
 * for a failed chunk.
 */
type Provider = { name: string; request: (texts: string[]) => Promise<Output | undefined> };

let anthropic: Anthropic | undefined;
const claude: Provider = {
  name: 'Claude',
  async request(texts) {
    anthropic ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    try {
      const response = await anthropic.messages.parse({
        model: env.TRANSLIT_MODEL,
        max_tokens: 16000,
        // Word-by-word transliteration is simple; low effort keeps it fast and cheap.
        output_config: { effort: 'low', format: zodOutputFormat(Output) },
        system: SYSTEM,
        messages: [{ role: 'user', content: userPrompt(texts) }],
      });
      if (response.stop_reason === 'refusal') return undefined;
      return response.parsed_output ?? undefined;
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        throw new FatalError('ANTHROPIC_API_KEY is invalid.');
      }
      throw error;
    }
  },
};

const gemini: Provider = {
  name: 'Gemini',
  async request(texts) {
    // The pool moves to the next free model when one is rate-limited.
    const { result } = await geminiPool.run('convert', async (model) => {
      const response = await geminiClient().models.generateContent({
        model,
        contents: userPrompt(texts),
        config: {
          systemInstruction: SYSTEM,
          responseMimeType: 'application/json',
          responseJsonSchema: z.toJSONSchema(Output),
        },
      });
      const parsed = Output.safeParse(JSON.parse(response.text ?? 'null'));
      return {
        value: parsed.success ? parsed.data : undefined,
        tokens: response.usageMetadata?.totalTokenCount,
      };
    });
    return result;
  },
};

/** Claude when its key is set (the research plan's choice), else Gemini's free tier. */
function provider(): Provider | undefined {
  if (env.ANTHROPIC_API_KEY) return claude;
  if (env.GEMINI_API_KEY) return gemini;
  return undefined;
}

export const transliterationProvider = () => {
  const p = provider();
  return p && (p === claude ? `Claude (${env.TRANSLIT_MODEL})` : 'Gemini (auto model)');
};

async function convertChunk(p: Provider, texts: string[]): Promise<Output | undefined> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await p.request(texts);
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
 * toggle never changes timings. Without a model key, or if a chunk fails,
 * words keep only the script the ASR produced.
 */
export async function transliterate(
  words: readonly Word[],
  nativeScript: Script,
): Promise<TransliterateResult> {
  const p = provider();
  if (!p) return { words: [...words], complete: false };

  const result = [...words];
  let complete = true;

  for (let start = 0; start < words.length; start += CHUNK) {
    const chunk = words.slice(start, start + CHUNK);
    const texts = chunk.map((w) => w.text[nativeScript] ?? '');
    try {
      const out = await convertChunk(p, texts);
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
      if (error instanceof FatalError) throw error;
      console.warn(`${p.name} transliteration chunk failed: ${(error as Error).message}`);
      complete = false;
    }
  }
  return { words: result, complete };
}
