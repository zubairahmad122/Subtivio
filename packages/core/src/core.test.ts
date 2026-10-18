import { describe, expect, it } from 'vitest';

import { assColor, toAss } from './ass';
import { applySpellingRules } from './dictionary';
import { retextLine } from './editing';
import { activeWordIndex, groupIntoLines, lineAt } from './grouping';
import { SAMPLE_TRANSCRIPT } from './sample';
import { toSrt } from './srt';
import { getTemplate } from './templates';
import { availableScripts, wordText } from './transcript';

const words = SAMPLE_TRANSCRIPT.words;

describe('groupIntoLines', () => {
  it('respects the word limit and keeps every word exactly once', () => {
    const lines = groupIntoLines(words, 'roman', { maxWords: 3, maxChars: 99, breakOnGap: 9 });
    expect(lines.every((l) => l.words.length <= 3)).toBe(true);
    expect(lines.flatMap((l) => l.words)).toEqual(words);
  });

  it('starts a new line after a pause', () => {
    const lines = groupIntoLines(words, 'roman', { maxWords: 99, maxChars: 999, breakOnGap: 0.5 });
    expect(lines).toHaveLength(2);
    expect(wordText(lines[1]!.words[0]!, 'roman')).toBe('Bas');
  });

  it('measures length in the selected script', () => {
    const opts = { maxWords: 99, maxChars: 12, breakOnGap: 9 };
    expect(groupIntoLines(words, 'urdu', opts).length).not.toBe(
      groupIntoLines(words, 'roman', opts).length,
    );
  });
});

describe('lineAt / activeWordIndex', () => {
  const lines = groupIntoLines(words, 'roman');

  it('finds the line and word being spoken', () => {
    const line = lineAt(lines, 1.3);
    expect(line).toBeDefined();
    expect(wordText(line!.words[activeWordIndex(line!, 1.3)]!, 'roman')).toBe('batata');
  });

  it('returns nothing during silence', () => {
    expect(lineAt(lines, 4.2)).toBeUndefined();
    expect(lineAt(lines, 0)).toBeUndefined();
  });
});

describe('applySpellingRules', () => {
  it('replaces whole words, keeps punctuation and timing', () => {
    const out = applySpellingRules(
      words,
      [
        { script: 'roman', from: 'hain', to: 'hn' },
        { script: 'roman', from: 'MAIN', to: 'mein' },
      ],
      'roman',
    );
    expect(out[10]!.text.roman).toBe('hn.');
    expect(out[1]!.text.roman).toBe('mein');
    expect(out[10]!.start).toBe(words[10]!.start);
    expect(out[10]!.text.urdu).toBe(words[10]!.text.urdu);
  });

  it('ignores rules for other scripts', () => {
    const out = applySpellingRules(words, [{ script: 'hindi', from: 'aaj', to: 'x' }], 'roman');
    expect(out).toEqual(words);
  });
});

describe('transcript helpers', () => {
  it('reports scripts every word has', () => {
    expect(availableScripts(SAMPLE_TRANSCRIPT)).toEqual(['roman', 'urdu', 'hindi']);
  });

  it('serialises SRT', () => {
    const srt = toSrt(groupIntoLines(words, 'roman').slice(0, 1), 'roman');
    expect(srt).toBe('1\n00:00:00,200 --> 00:00:01,200\nAaj main aap ko\n');
  });
});

describe('retextLine', () => {
  const line = groupIntoLines(words, 'roman')[0]!;

  it('keeps timings and other scripts when the word count matches', () => {
    const out = retextLine(words, line, 'Aaj mein ap ko', 'roman');
    expect(out.slice(0, 4).map((w) => w.text.roman)).toEqual(['Aaj', 'mein', 'ap', 'ko']);
    expect(out[1]!.text.urdu).toBe(words[1]!.text.urdu);
    expect(out[1]!.start).toBe(words[1]!.start);
    expect(out).toHaveLength(words.length);
  });

  it('re-splits the line span when the word count changes', () => {
    const out = retextLine(words, line, 'Assalam o alaikum dosto aaj', 'roman');
    const edited = out.slice(0, 5);
    expect(out).toHaveLength(words.length + 1);
    expect(edited[0]!.start).toBe(line.start);
    expect(edited.at(-1)!.end).toBe(line.end);
    for (let i = 1; i < edited.length; i++) expect(edited[i]!.start).toBe(edited[i - 1]!.end);
    expect(out[5]).toEqual(words[4]);
  });
});

describe('toAss', () => {
  const template = getTemplate('signature');
  const ass = toAss({
    words,
    script: 'roman',
    template,
    width: 1080,
    height: 1920,
    watermark: true,
  });
  const dialogues = ass.split('\n').filter((l) => l.startsWith('Dialogue: 0,'));

  it('emits one event per word, highlighting that word', () => {
    expect(dialogues).toHaveLength(words.length);
    expect(dialogues[0]).toContain('{\\c&H0040B7F4}Aaj{\\c&H00FFFFFF}');
    expect(dialogues[1]).toMatch(/Aaj \{\\c&H0040B7F4\}main/);
  });

  it('uses video-relative size and position', () => {
    expect(ass).toContain('PlayResX: 1080');
    expect(ass).toContain(
      `Style: Caption,Inter ExtraBold,${Math.round(1080 * template.size * 1.43)},`,
    );
    expect(dialogues[0]).toContain(`\\pos(540,${Math.round(1920 * template.y)})`);
  });

  it('adds the watermark only when asked', () => {
    expect(ass).toContain('Made with Subtivio');
    const clean = toAss({
      words,
      script: 'urdu',
      template,
      width: 720,
      height: 1280,
      watermark: false,
    });
    expect(clean).not.toContain('Made with Subtivio');
    expect(clean).toContain('Noto Nastaliq Urdu');
    expect(clean).toContain('آج');
  });

  it('converts css colours to ASS', () => {
    expect(assColor('#F4B740')).toBe('&H0040B7F4');
    expect(assColor('rgba(255,255,255,0.55)')).toBe('&H73FFFFFF');
  });
});
