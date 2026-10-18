import os from 'node:os';

import { serve } from '@hono/node-server';

import { app } from './app';
import { env } from './env';
import { recoverInterruptedJobs } from './jobs';
import { prepareFonts } from './pipeline/media';

await prepareFonts();
await recoverInterruptedJobs();

serve({ fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' }, ({ port }) => {
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .find((i) => i?.family === 'IPv4' && !i.internal)?.address;
  console.log(
    `Subtivio server on http://localhost:${port}${lan ? ` (phone: http://${lan}:${port})` : ''}`,
  );
  console.log(
    `  transcription: ${env.ASSEMBLYAI_API_KEY ? 'AssemblyAI' : 'demo (no ASSEMBLYAI_API_KEY)'}`,
  );
  console.log(
    `  script conversion: ${env.ANTHROPIC_API_KEY ? env.TRANSLIT_MODEL : 'off (no ANTHROPIC_API_KEY)'}`,
  );
  console.log(`  data: ${env.DATA_DIR}`);
});
