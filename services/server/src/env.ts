import path from 'node:path';

import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().default(8787),
  DATA_DIR: z.string().default('./data'),
  ASSEMBLYAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  TRANSLIT_MODEL: z.string().default('claude-haiku-5-5'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
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
