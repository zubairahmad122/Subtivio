import { readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { ApiError, GoogleGenAI } from '@google/genai';

import { env } from '../env';

/** Problems that switching model cannot fix, such as a bad API key. */
export class FatalError extends Error {}

/**
 * What a request is for. Transcribing audio is the hard job, so it gets the
 * strongest Flash model first; converting words between scripts is easy, so
 * it starts on Flash-Lite and leaves the Flash quota for transcription.
 */
export type GeminiTask = 'transcribe' | 'convert';

/** Used when the model list cannot be fetched. */
const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

const FLASH = /^gemini-(\d+(?:\.\d+)?)-flash(-lite)?$/;

type ModelInfo = { name: string; version: number; lite: boolean };

function parseModel(name: string): ModelInfo | undefined {
  const m = FLASH.exec(name.replace(/^models\//, ''));
  return m ? { name: m[0], version: Number(m[1]), lite: Boolean(m[2]) } : undefined;
}

export const isLite = (model: string) => parseModel(model)?.lite ?? model.includes('lite');

/**
 * Keeps stable Flash / Flash-Lite models (the ones on the free tier) and
 * orders them newest first, Flash before Flash-Lite of the same version.
 */
export function rankModels(names: readonly string[]): string[] {
  return names
    .flatMap((n) => parseModel(n) ?? [])
    .sort((a, b) => b.version - a.version || Number(a.lite) - Number(b.lite))
    .map((m) => m.name);
}

/** Model order for a task; `preferred` (GEMINI_MODEL) always goes first. */
export function orderForTask(
  models: readonly string[],
  task: GeminiTask,
  preferred?: string,
): string[] {
  const firstLite = task === 'convert';
  const ordered = [...models].sort((a, b) => {
    const la = isLite(a) === firstLite ? 0 : 1;
    const lb = isLite(b) === firstLite ? 0 : 1;
    return la - lb; // stable sort keeps newest-first within each group
  });
  return preferred ? [preferred, ...ordered.filter((m) => m !== preferred)] : ordered;
}

// ------------------------------------------------------------- quota day

const pacific = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function pacificParts(now: number) {
  const p = Object.fromEntries(pacific.formatToParts(now).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, h: +p.hour!, m: +p.minute!, s: +p.second! };
}

/** Gemini's daily quotas reset at midnight Pacific time. */
export const quotaDay = (now: number) => pacificParts(now).day;

export function nextQuotaReset(now: number): number {
  const { h, m, s } = pacificParts(now);
  const wholeSecond = now - (now % 1000);
  return wholeSecond + (24 * 3600 - (h * 3600 + m * 60 + s)) * 1000;
}

// ----------------------------------------------------------------- usage

type DayUsage = { day: string; requests: number; tokens: number };

/** Requests and tokens per model for the current quota day, saved to disk. */
export class UsageTracker {
  private usage: Record<string, DayUsage> = {};

  constructor(private readonly file?: string) {
    if (!file) return;
    try {
      this.usage = JSON.parse(readFileSync(file, 'utf8')) as Record<string, DayUsage>;
    } catch {
      // first run: no file yet
    }
  }

  get(model: string, now: number): DayUsage {
    const day = quotaDay(now);
    const u = this.usage[model];
    return u?.day === day ? u : { day, requests: 0, tokens: 0 };
  }

  record(model: string, tokens: number, now: number) {
    const u = this.get(model, now);
    this.usage[model] = { day: u.day, requests: u.requests + 1, tokens: u.tokens + tokens };
    if (this.file) {
      void fs
        .mkdir(path.dirname(this.file), { recursive: true })
        .then(() => fs.writeFile(this.file!, JSON.stringify(this.usage, null, 2)))
        .catch(() => {});
    }
  }
}

// ------------------------------------------------------------------ pool

type ErrorKind = 'fatal' | 'rate-limited' | 'missing' | 'unavailable' | 'other';

function classify(error: unknown): ErrorKind {
  if (!(error instanceof ApiError)) return 'other';
  if ((error.status === 400 || error.status === 403) && /api key/i.test(error.message)) {
    return 'fatal';
  }
  if (error.status === 429) return 'rate-limited';
  if (error.status === 404) return 'missing';
  if (error.status >= 500) return 'unavailable';
  return 'other';
}

/** How long to rest a rate-limited model: until reset for daily quota, else Google's retry hint. */
function cooldownEnd(error: ApiError, now: number): number {
  if (/per ?day|perday|daily/i.test(error.message)) return nextQuotaReset(now);
  const retry = /retryDelay"?\s*:\s*"?(\d+(?:\.\d+)?)s/.exec(error.message);
  return now + (retry ? Number(retry[1]) * 1000 : 60_000);
}

export type ModelState = 'ready' | 'cooling-down' | 'used-up' | 'unavailable';

export type ModelStatus = {
  model: string;
  tier: 'flash' | 'flash-lite';
  requestsToday: number;
  tokensToday: number;
  /** Estimated free requests per day (Google does not report the real number). */
  dailyLimit: number;
  remaining: number;
  state: ModelState;
  /** When a resting model can be used again (ISO time). */
  availableAt?: string;
};

type PoolOptions = {
  usage?: UsageTracker;
  dailyLimit?: (model: string) => number;
  preferred?: string;
  now?: () => number;
};

/**
 * Runs each request on the best model for its task and moves down the list
 * when a model is out of free quota (by our own count or a 429 from Google),
 * missing, or overloaded.
 */
export class ModelPool {
  private restUntil = new Map<string, number>();
  private readonly usage: UsageTracker;
  private readonly dailyLimit: (model: string) => number;
  private readonly now: () => number;

  constructor(
    private readonly models: () => Promise<string[]>,
    private readonly options: PoolOptions = {},
  ) {
    this.usage = options.usage ?? new UsageTracker();
    this.dailyLimit = options.dailyLimit ?? (() => Infinity);
    this.now = options.now ?? Date.now;
  }

  private state(model: string): { state: ModelState; availableAt?: number } {
    const now = this.now();
    const rest = this.restUntil.get(model) ?? 0;
    if (rest === Infinity) return { state: 'unavailable' };
    if (rest > now) return { state: 'cooling-down', availableAt: rest };
    if (this.usage.get(model, now).requests >= this.dailyLimit(model)) {
      return { state: 'used-up', availableAt: nextQuotaReset(now) };
    }
    return { state: 'ready' };
  }

  async run<T>(
    task: GeminiTask,
    call: (model: string) => Promise<{ value: T; tokens?: number }>,
  ): Promise<{ result: T; model: string }> {
    const models = orderForTask(await this.models(), task, this.options.preferred);
    let lastError: unknown;
    for (const model of models) {
      if (this.state(model).state !== 'ready') continue;
      try {
        const { value, tokens } = await call(model);
        this.usage.record(model, tokens ?? 0, this.now());
        return { result: value, model };
      } catch (error) {
        const kind = classify(error);
        if (kind === 'fatal') throw new FatalError('GEMINI_API_KEY is invalid.');
        if (kind === 'other') throw error;
        lastError = error;
        if (kind === 'rate-limited') {
          this.restUntil.set(model, cooldownEnd(error as ApiError, this.now()));
        }
        if (kind === 'missing') this.restUntil.set(model, Infinity);
        console.warn(`Gemini ${model} ${kind} (${task}); trying the next model.`);
      }
    }
    throw new Error(
      `All Gemini models are busy or out of free quota. Try again later. (${
        lastError instanceof Error ? lastError.message : 'every model is resting'
      })`,
    );
  }

  /** Per-model usage and availability for the app's Settings screen. */
  async status(): Promise<ModelStatus[]> {
    const now = this.now();
    return (await this.models()).map((model) => {
      const used = this.usage.get(model, now);
      const limit = this.dailyLimit(model);
      const { state, availableAt } = this.state(model);
      return {
        model,
        tier: isLite(model) ? 'flash-lite' : 'flash',
        requestsToday: used.requests,
        tokensToday: used.tokens,
        dailyLimit: limit,
        remaining: Math.max(0, limit - used.requests),
        state,
        availableAt: availableAt ? new Date(availableAt).toISOString() : undefined,
      };
    });
  }
}

// ---------------------------------------------------------------- client

let client: GoogleGenAI | undefined;
export function gemini(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

let modelList: Promise<string[]> | undefined;

/** GEMINI_MODELS if set, else the free Flash models this key can use. */
export function geminiModels(): Promise<string[]> {
  modelList ??= (async () => {
    if (env.GEMINI_MODELS) return env.GEMINI_MODELS.split(',').map((m) => m.trim());
    try {
      const names: string[] = [];
      for await (const model of await gemini().models.list()) {
        if (model.name && model.supportedActions?.includes('generateContent')) {
          names.push(model.name);
        }
      }
      const ranked = rankModels(names);
      if (ranked.length > 0) return ranked;
    } catch (error) {
      console.warn(`Could not list Gemini models (${(error as Error).message}); using defaults.`);
    }
    return FALLBACK_MODELS;
  })();
  return modelList;
}

export const geminiPool = new ModelPool(geminiModels, {
  usage: new UsageTracker(path.join(env.DATA_DIR, 'gemini-usage.json')),
  dailyLimit: (model) =>
    isLite(model) ? env.GEMINI_LITE_DAILY_LIMIT : env.GEMINI_FLASH_DAILY_LIMIT,
  preferred: env.GEMINI_MODEL,
});
