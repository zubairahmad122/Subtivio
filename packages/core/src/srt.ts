import type { CaptionLine } from './grouping';
import type { Script } from './scripts';
import { wordText } from './transcript';

function timestamp(seconds: number): string {
  const ms = Math.round(seconds * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
}

/** Serialises caption lines as an SRT file in the chosen script. */
export function toSrt(lines: readonly CaptionLine[], script: Script): string {
  return lines
    .map((line, i) => {
      const text = line.words.map((w) => wordText(w, script)).join(' ');
      return `${i + 1}\n${timestamp(line.start)} --> ${timestamp(line.end)}\n${text}\n`;
    })
    .join('\n');
}
