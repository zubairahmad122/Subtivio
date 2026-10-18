import path from 'node:path';

import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().default(8787),
  DATA_DIR: z.string().default('./data'),
  ASSEMBLYAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  TRANSLIT_MODEL: z.string().default('claude-haiku-5-5'),
  GEMINI_API_KEY: z.string().optional(),
  /** Tried first; the rest of the free Flash models follow automatically. */
  GEMINI_MODEL: z.string().optional(),
  /** Comma-separated list that replaces automatic model discovery. */
  GEMINI_MODELS: z.string().optional(),
  /**
   * Estimated free requests per day. Google does not report the real quota
   * (see AI Studio); these numbers only decide when to switch model early.
   */
  GEMINI_FLASH_DAILY_LIMIT: z.coerce.number().int().positive().default(1500),
  GEMINI_LITE_DAILY_LIMIT: z.coerce.number().int().positive().default(1000),
  FFMPEG_PATH: z.string().default('ffmpeg'),
  FFPROBE_PATH: z.string().default('ffprobe'),
});

const parsed = EnvSchema.parse(
  Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== '')),
);

export const env = {
  ...parsed,
  DATA_DIR: path.resolve(parsed.DATA_DIR),
};
