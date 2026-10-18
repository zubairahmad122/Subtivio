import { ApiError, GoogleGenAI } from '@google/genai';

import { env } from '../env';

/** Problems that switching model cannot fix, such as a bad API key. */
export class FatalError extends Error {}

/** Used when the model list cannot be fetched. Newest first. */
const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

const FLASH = /^gemini-(\d+(?:\.\d+)?)-flash(-lite)?$/;

/**
 * Keeps stable Flash / Flash-Lite models (the ones on the free tier) and
 * orders them newest first, Flash before Flash-Lite of the same version.
 */
export function rankModels(names: readonly string[]): string[] {
  return names
    .map((n) => n.replace(/^models\//, ''))
    .flatMap((name) => {
      const m = FLASH.exec(name);
      return m ? [{ name, version: Number(m[1]), lite: Boolean(m[2]) }] : [];
    })
    .sort((a, b) => b.version - a.version || Number(a.lite) - Number(b.lite))
    .map((m) => m.name);
}

type ErrorKind = 'fatal' | 'rate-limited' | 'missing' | 'unavailable' | 'other';

function classify(error: unknown): ErrorKind {
  if (!(error instanceof ApiError)) return 'other';
  if ((error.status === 400 || error.status === 403) && /api key/i.test(error.message))
    return 'fatal';
  if (error.status === 429) return 'rate-limited';
  if (error.status === 404) return 'missing';
  if (error.status >= 500) return 'unavailable';
  return 'other';
}

const RATE_LIMIT_COOLDOWN_MS = 5 * 60_000;

/**
 * Runs a request on the first usable model and moves down the list when a
 * model is rate-limited (free-tier quota), missing, or overloaded. A
 * rate-limited model sits out for a few minutes; a missing one for good.
 */
export class ModelPool {
  private cooldownUntil = new Map<string, number>();

  constructor(
    private readonly models: () => Promise<string[]>,
    private readonly now: () => number = Date.now,
  ) {}

  async run<T>(call: (model: string) => Promise<T>): Promise<{ result: T; model: string }> {
    const models = await this.models();
    let lastError: unknown;
    for (const model of models) {
      if ((this.cooldownUntil.get(model) ?? 0) > this.now()) continue;
      try {
        return { result: await call(model), model };
      } catch (error) {
        const kind = classify(error);
        if (kind === 'fatal') throw new FatalError('GEMINI_API_KEY is invalid.');
        if (kind === 'other') throw error;
        lastError = error;
        if (kind === 'rate-limited')
          this.cooldownUntil.set(model, this.now() + RATE_LIMIT_COOLDOWN_MS);
        if (kind === 'missing') this.cooldownUntil.set(model, Infinity);
        console.warn(`Gemini ${model} ${kind}, trying the next model.`);
      }
    }
    throw new Error(
      `All Gemini models are busy or out of free quota. Try again in a few minutes. (${
        lastError instanceof Error ? lastError.message : 'no model available'
      })`,
    );
  }
}

let client: GoogleGenAI | undefined;
export function gemini(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

let modelList: Promise<string[]> | undefined;

/** GEMINI_MODELS if set, else the Flash models this key can use, newest first. */
export function geminiModels(): Promise<string[]> {
  modelList ??= (async () => {
    const preferred = env.GEMINI_MODEL ? [env.GEMINI_MODEL] : [];
    if (env.GEMINI_MODELS) {
      return [...new Set([...preferred, ...env.GEMINI_MODELS.split(',').map((m) => m.trim())])];
    }
    try {
      const names: string[] = [];
      for await (const model of await gemini().models.list()) {
        if (model.name && model.supportedActions?.includes('generateContent'))
          names.push(model.name);
      }
      const ranked = rankModels(names);
      if (ranked.length > 0) return [...new Set([...preferred, ...ranked])];
    } catch (error) {
      console.warn(`Could not list Gemini models (${(error as Error).message}); using defaults.`);
    }
    return [...new Set([...preferred, ...FALLBACK_MODELS])];
  })();
  return modelList;
}

export const geminiPool = new ModelPool(geminiModels);
