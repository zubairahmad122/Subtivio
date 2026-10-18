import { ApiError } from '@google/genai';
import { describe, expect, it } from 'vitest';

import { FatalError, ModelPool, rankModels } from './gemini';
import { segmentsToWords } from './segments';

const apiError = (status: number, message = 'error') => new ApiError({ status, message });

describe('rankModels', () => {
  it('keeps stable Flash models, newest first, Flash before Lite', () => {
    expect(
      rankModels([
        'models/gemini-2.5-flash',
        'models/gemini-3.5-flash-lite',
        'models/gemini-3.8-flash',
        'models/gemini-3.8-pro',
        'models/gemini-3.6-flash-preview-09-2026',
        'models/gemini-3.5-flash',
        'models/text-embedding-004',
      ]),
    ).toEqual([
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash',
    ]);
  });
});

describe('ModelPool', () => {
  const models = async () => ['a', 'b', 'c'];

  it('moves to the next model when one is rate-limited, and skips it afterwards', async () => {
    let now = 0;
    const pool = new ModelPool(models, () => now);
    const tried: string[] = [];
    const call = async (m: string) => {
      tried.push(m);
      if (m === 'a') throw apiError(429, 'quota exceeded');
      return m;
    };
    expect(await pool.run(call)).toEqual({ result: 'b', model: 'b' });
    expect(await pool.run(call)).toEqual({ result: 'b', model: 'b' });
    expect(tried).toEqual(['a', 'b', 'b']);

    now += 6 * 60_000; // cooldown over: model a is tried again
    await pool.run(call);
    expect(tried.at(-2)).toBe('a');
  });

  it('skips missing and overloaded models', async () => {
    const pool = new ModelPool(models);
    const result = await pool.run(async (m) => {
      if (m === 'a') throw apiError(404, 'model not found');
      if (m === 'b') throw apiError(503, 'overloaded');
      return m;
    });
    expect(result.model).toBe('c');
  });

  it('stops on a bad API key and on ordinary errors', async () => {
    const pool = new ModelPool(models);
    await expect(
      pool.run(async () => Promise.reject(apiError(400, 'API key not valid'))),
    ).rejects.toThrow(FatalError);
    await expect(pool.run(async () => Promise.reject(new Error('bad json')))).rejects.toThrow(
      'bad json',
    );
  });

  it('explains when every model is out of quota', async () => {
    const pool = new ModelPool(models);
    await expect(pool.run(async () => Promise.reject(apiError(429)))).rejects.toThrow(
      /out of free quota/,
    );
  });
});

describe('segmentsToWords', () => {
  const w = (roman: string) => ({ roman, urdu: roman, hindi: roman });

  it('shares a phrase span across its words by length', () => {
    const words = segmentsToWords(
      { segments: [{ start: 1, end: 3, words: [w('ab'), w('abcdef')] }] },
      10,
    );
    expect(words.map((x) => [x.start, x.end])).toEqual([
      [1, 1.5],
      [1.5, 3],
    ]);
    expect(words[0]!.text).toEqual({ roman: 'ab', urdu: 'ab', hindi: 'ab' });
  });

  it('sorts phrases, removes overlap and clamps to the video length', () => {
    const words = segmentsToWords(
      {
        segments: [
          { start: 4, end: 9, words: [w('late')] },
          { start: 0.5, end: 4.5, words: [w('early')] },
        ],
      },
      6,
    );
    expect(words.map((x) => x.text.roman)).toEqual(['early', 'late']);
    expect(words[1]!.start).toBe(4.5);
    expect(words[1]!.end).toBe(6);
    expect(words.map((x) => x.id)).toEqual(['w0', 'w1']);
  });

  it('drops empty phrases', () => {
    expect(segmentsToWords({ segments: [{ start: 0, end: 1, words: [] }] }, 5)).toEqual([]);
  });
});
