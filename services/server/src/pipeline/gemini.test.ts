import { ApiError } from '@google/genai';
import { describe, expect, it } from 'vitest';

import {
  FatalError,
  ModelPool,
  nextQuotaReset,
  orderForTask,
  quotaDay,
  rankModels,
} from './gemini';
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

describe('orderForTask', () => {
  const models = [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash-lite',
  ];

  it('puts Flash first for transcription and Flash-Lite first for conversion', () => {
    expect(orderForTask(models, 'transcribe')).toEqual(models);
    expect(orderForTask(models, 'convert')).toEqual([
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
    ]);
  });

  it('always tries the preferred model first', () => {
    expect(orderForTask(models, 'convert', 'gemini-3.8-flash')[0]).toBe('gemini-3.8-flash');
  });
});

describe('ModelPool', () => {
  const models = async () => ['flash-a', 'flash-b', 'x-lite'];
  const ok = (m: string) => Promise.resolve({ value: m, tokens: 10 });

  it('moves to the next model on a per-minute limit and retries it after the hint', async () => {
    let now = Date.UTC(2026, 9, 18, 12);
    const pool = new ModelPool(models, { now: () => now });
    const tried: string[] = [];
    const call = async (m: string) => {
      tried.push(m);
      if (m === 'flash-a') throw apiError(429, 'quota exceeded, "retryDelay": "30s"');
      return { value: m };
    };
    expect(await pool.run('transcribe', call)).toEqual({ result: 'flash-b', model: 'flash-b' });
    await pool.run('transcribe', call);
    expect(tried).toEqual(['flash-a', 'flash-b', 'flash-b']);
    now += 31_000;
    await pool.run('transcribe', call);
    expect(tried.at(-2)).toBe('flash-a');
  });

  it('rests a model until the Pacific midnight reset when its daily quota is gone', async () => {
    let now = Date.UTC(2026, 9, 18, 12); // 05:00 in Los Angeles
    const pool = new ModelPool(models, { now: () => now });
    const call = async (m: string) => {
      if (m === 'flash-a') throw apiError(429, 'GenerateRequestsPerDayPerProjectPerModel-FreeTier');
      return { value: m };
    };
    await pool.run('transcribe', call);
    const [a] = await pool.status();
    expect(a).toMatchObject({ model: 'flash-a', state: 'cooling-down' });
    expect(a!.availableAt).toBe('2026-10-19T07:00:00.000Z'); // midnight PDT
    now = Date.UTC(2026, 9, 19, 8);
    expect((await pool.run('transcribe', ok)).model).toBe('flash-a');
  });

  it('switches early once our own count reaches the estimated daily limit', async () => {
    const pool = new ModelPool(models, { dailyLimit: (m) => (m === 'flash-a' ? 2 : 100) });
    expect((await pool.run('transcribe', ok)).model).toBe('flash-a');
    expect((await pool.run('transcribe', ok)).model).toBe('flash-a');
    expect((await pool.run('transcribe', ok)).model).toBe('flash-b');
    const status = await pool.status();
    expect(status[0]).toMatchObject({
      requestsToday: 2,
      tokensToday: 20,
      remaining: 0,
      state: 'used-up',
    });
    expect(status[1]).toMatchObject({
      requestsToday: 1,
      remaining: 99,
      state: 'ready',
      tier: 'flash',
    });
    expect(status[2]).toMatchObject({ tier: 'flash-lite', requestsToday: 0 });
  });

  it('skips missing and overloaded models', async () => {
    const pool = new ModelPool(models);
    const result = await pool.run('transcribe', async (m) => {
      if (m === 'flash-a') throw apiError(404, 'model not found');
      if (m === 'flash-b') throw apiError(503, 'overloaded');
      return { value: m };
    });
    expect(result.model).toBe('x-lite');
    expect((await pool.status())[0]!.state).toBe('unavailable');
  });

  it('stops on a bad API key and on ordinary errors', async () => {
    const pool = new ModelPool(models);
    await expect(
      pool.run('convert', () => Promise.reject(apiError(400, 'API key not valid'))),
    ).rejects.toThrow(FatalError);
    await expect(pool.run('convert', () => Promise.reject(new Error('bad json')))).rejects.toThrow(
      'bad json',
    );
  });

  it('explains when every model is out of quota', async () => {
    const pool = new ModelPool(models);
    await expect(pool.run('convert', () => Promise.reject(apiError(429)))).rejects.toThrow(
      /out of free quota/,
    );
  });
});

describe('quota day', () => {
  it('resets at midnight Pacific time', () => {
    const now = Date.UTC(2026, 9, 18, 6, 59); // 23:59 PDT on Oct 17
    expect(quotaDay(now)).toBe('2026-10-17');
    expect(nextQuotaReset(now)).toBe(Date.UTC(2026, 9, 18, 7));
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
