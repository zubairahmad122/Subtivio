import type { CaptionLine } from './grouping';
import type { Script } from './scripts';
import type { Word } from './transcript';

/**
 * Replaces the text of one caption line after a manual edit.
 *
 * Same word count: each word keeps its timing and only the edited script
 * changes, so the other scripts stay in sync.
 *
 * Different word count: the line's time span is re-split across the new
 * words in proportion to their length. Those words only carry the edited
 * script until the worker re-transliterates them.
 */
export function retextLine(
  words: readonly Word[],
  line: CaptionLine,
  text: string,
  script: Script,
): Word[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const first = words.findIndex((w) => w.id === line.words[0]?.id);
  if (first === -1) return [...words];

  let replacement: Word[];
  if (tokens.length === line.words.length) {
    replacement = line.words.map((w, i) => ({ ...w, text: { ...w.text, [script]: tokens[i]! } }));
  } else {
    const span = line.end - line.start;
    const totalChars = tokens.reduce((n, t) => n + t.length, 0) || 1;
    let cursor = line.start;
    replacement = tokens.map((token, i) => {
      const start = cursor;
      cursor = i === tokens.length - 1 ? line.end : cursor + (span * token.length) / totalChars;
      return { id: `${line.id}.${i}`, start, end: cursor, text: { [script]: token } };
    });
  }

  return [...words.slice(0, first), ...replacement, ...words.slice(first + line.words.length)];
}
