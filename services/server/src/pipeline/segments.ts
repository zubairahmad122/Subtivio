import type { Word } from '@subtivio/core';
import { z } from 'zod';

/** What Gemini returns: short phrases with times, each word in all three scripts. */
export const SegmentsSchema = z.object({
  segments: z.array(
    z.object({
      start: z.number(),
      end: z.number(),
      words: z.array(z.object({ urdu: z.string(), roman: z.string(), hindi: z.string() })),
    }),
  ),
});
export type Segments = z.infer<typeof SegmentsSchema>;

/**
 * Turns phrase-level timings into word timings. LLM timestamps are reliable
 * per phrase but not per word, so each phrase's span is shared out by word
 * length. Phrases are sorted, clamped to the video and made non-overlapping.
 */
export function segmentsToWords({ segments }: Segments, durationSec: number): Word[] {
  const words: Word[] = [];
  let cursor = 0;

  const ordered = [...segments].filter((s) => s.words.length > 0).sort((a, b) => a.start - b.start);

  for (const segment of ordered) {
    const start = Math.min(Math.max(segment.start, cursor), durationSec);
    // Give every word at least 80 ms even if the phrase was stamped too short.
    const minEnd = start + 0.08 * segment.words.length;
    const end = Math.min(Math.max(segment.end, minEnd), Math.max(durationSec, start));
    if (end <= start) continue;

    const lengths = segment.words.map((w) => Math.max(1, (w.roman || w.urdu).length));
    const total = lengths.reduce((a, b) => a + b, 0);
    let t = start;
    segment.words.forEach((w, i) => {
      const wordEnd =
        i === segment.words.length - 1 ? end : t + ((end - start) * lengths[i]!) / total;
      words.push({
        id: `w${words.length}`,
        start: +t.toFixed(3),
        end: +wordEnd.toFixed(3),
        text: { urdu: w.urdu, roman: w.roman, hindi: w.hindi },
      });
      t = wordEnd;
    });
    cursor = end;
  }
  return words;
}
