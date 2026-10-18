import { wordText, type Word } from './transcript';
import type { Script } from './scripts';

export type CaptionLine = {
  /** Stable id: the first word's id. */
  id: string;
  start: number;
  end: number;
  words: Word[];
};

export type GroupingOptions = {
  /** Hard cap on words per on-screen line. */
  maxWords: number;
  /** Soft cap on characters per line, measured in the chosen script. */
  maxChars: number;
  /** A silence longer than this (seconds) always starts a new line. */
  breakOnGap: number;
};

export const DEFAULT_GROUPING: GroupingOptions = {
  maxWords: 4,
  maxChars: 22,
  breakOnGap: 0.6,
};

/**
 * Splits timed words into short caption lines, the way reels show them.
 * A line breaks at the word limit, the character limit, or a pause.
 */
export function groupIntoLines(
  words: readonly Word[],
  script: Script,
  options: GroupingOptions = DEFAULT_GROUPING,
): CaptionLine[] {
  const lines: CaptionLine[] = [];
  let current: Word[] = [];
  let chars = 0;

  const flush = () => {
    const first = current[0];
    const last = current.at(-1);
    if (first && last) {
      lines.push({ id: first.id, start: first.start, end: last.end, words: current });
    }
    current = [];
    chars = 0;
  };

  for (const word of words) {
    const length = wordText(word, script).length;
    const prev = current.at(-1);
    const pause = prev ? word.start - prev.end : 0;
    const wouldOverflow =
      current.length >= options.maxWords ||
      (current.length > 0 && chars + 1 + length > options.maxChars);

    if (prev && (wouldOverflow || pause > options.breakOnGap)) flush();

    current.push(word);
    chars += (current.length > 1 ? 1 : 0) + length;
  }
  flush();

  return lines;
}

/** The line on screen at time `t`, or undefined during silence. */
export function lineAt(lines: readonly CaptionLine[], t: number): CaptionLine | undefined {
  // Binary search: lines are sorted and non-overlapping.
  let lo = 0;
  let hi = lines.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const line = lines[mid]!;
    if (t < line.start) hi = mid - 1;
    else if (t >= line.end) lo = mid + 1;
    else return line;
  }
  return undefined;
}

/** Index of the word being spoken at `t` within `line`, or -1 between words. */
export function activeWordIndex(line: CaptionLine, t: number): number {
  return line.words.findIndex((w) => t >= w.start && t < w.end);
}
