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

const indexOfLine = (words: readonly Word[], line: CaptionLine) =>
  words.findIndex((w) => w.id === line.words[0]?.id);

/** Starts a new caption line at the line's `wordIndex`-th word. */
export function splitLineAt(words: readonly Word[], line: CaptionLine, wordIndex: number): Word[] {
  const target = line.words[wordIndex];
  if (!target || wordIndex === 0) return [...words];
  return words.map((w) => (w.id === target.id ? { ...w, breakBefore: true } : w));
}

/** Removes a whole caption line (e.g. a filler or a mis-heard phrase). */
export function deleteLine(words: readonly Word[], line: CaptionLine): Word[] {
  const ids = new Set(line.words.map((w) => w.id));
  return words.filter((w) => !ids.has(w.id));
}

/**
 * Moves a line earlier or later by `delta` seconds without overlapping the
 * words around it or leaving the video.
 */
export function shiftLine(
  words: readonly Word[],
  line: CaptionLine,
  delta: number,
  durationSec: number,
): Word[] {
  const first = indexOfLine(words, line);
  if (first === -1) return [...words];
  const last = first + line.words.length - 1;
  const minStart = words[first - 1]?.end ?? 0;
  const maxEnd = words[last + 1]?.start ?? durationSec;
  const clamped = Math.min(Math.max(delta, minStart - line.start), maxEnd - line.end);
  if (clamped === 0) return [...words];
  const round = (t: number) => +t.toFixed(3);
  return words.map((w, i) =>
    i >= first && i <= last
      ? { ...w, start: round(w.start + clamped), end: round(w.end + clamped) }
      : w,
  );
}
