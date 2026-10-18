import os from 'node:os';

import { serve } from '@hono/node-server';

import { app } from './app';
import { env } from './env';
import { recoverInterruptedJobs } from './jobs';
import { prepareFonts } from './pipeline/media';
import { transcriptionEngine } from './pipeline/transcribe';
import { transliterationProvider } from './pipeline/transliterate';

await prepareFonts();
await recoverInterruptedJobs();

serve({ fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' }, ({ port }) => {
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .find((i) => i?.family === 'IPv4' && !i.internal)?.address;
  console.log(
    `Subtivio server on http://localhost:${port}${lan ? ` (phone: http://${lan}:${port})` : ''}`,
  );
  const engine = transcriptionEngine();
  console.log(
    `  transcription: ${
      engine === 'assemblyai'
        ? `AssemblyAI${env.GEMINI_API_KEY ? ' (Gemini as backup)' : ''}`
        : engine === 'gemini'
          ? 'Gemini (auto model)'
          : 'demo (set ASSEMBLYAI_API_KEY or GEMINI_API_KEY)'
    }`,
  );
  console.log(
    `  script conversion: ${transliterationProvider() ?? 'off (set GEMINI_API_KEY or ANTHROPIC_API_KEY)'}`,
  );
  console.log(`  data: ${env.DATA_DIR}`);
});
