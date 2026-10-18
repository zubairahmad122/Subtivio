import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { serveStatic } from '@hono/node-server/serve-static';
import {
  ProjectSchema,
  ScriptSchema,
  SpellingRuleSchema,
  SpokenLanguageSchema,
  TranscriptSchema,
  type Project,
} from '@subtivio/core';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';

import { env } from './env';
import { startExport, startTranscription } from './jobs';
import { transliterationProvider } from './pipeline/transliterate';
import {
  deleteProject,
  getProject,
  listProjects,
  projectDir,
  projectsDir,
  saveProject,
  updateProject,
} from './store';

const SOURCE_NAME = 'source.mp4';
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

/** Stored URLs are server-relative; the client gets absolute ones for this host. */
function present(project: Project, origin: string): Project {
  const abs = (url?: string) => (url?.startsWith('/') ? `${origin}${url}` : url);
  return { ...project, videoUri: abs(project.videoUri), exportUrl: abs(project.exportUrl) };
}

const PatchSchema = ProjectSchema.pick({ title: true, script: true, templateId: true })
  .partial()
  .extend({ transcript: TranscriptSchema.optional() });

const ExportSchema = z.object({
  watermark: z.boolean().default(true),
  spellingRules: z.array(SpellingRuleSchema).default([]),
});

export const app = new Hono();

app.use('*', cors());

app.onError((err, c) => {
  if (err instanceof z.ZodError) return c.json({ error: z.prettifyError(err) }, 400);
  if ((err as NodeJS.ErrnoException).code === 'ENOENT') return c.json({ error: 'Not found' }, 404);
  console.error(err);
  return c.json({ error: err.message }, 500);
});

app.get('/health', (c) =>
  c.json({
    ok: true,
    transcription: env.ASSEMBLYAI_API_KEY ? 'assemblyai' : 'demo',
    transliteration: transliterationProvider() ?? 'off',
  }),
);

app.get('/projects', async (c) => {
  const origin = new URL(c.req.url).origin;
  return c.json((await listProjects()).map((p) => present(p, origin)));
});

app.get('/projects/:id', async (c) =>
  c.json(present(await getProject(c.req.param('id')), new URL(c.req.url).origin)),
);

/** Multipart upload: `video` file plus `title`, `language`, `script` fields. */
app.post('/projects', async (c) => {
  const body = await c.req.parseBody();
  const video = body.video;
  if (!(video instanceof File)) return c.json({ error: 'Missing "video" file.' }, 400);
  if (video.size > MAX_UPLOAD_BYTES) return c.json({ error: 'Video is larger than 500 MB.' }, 413);

  const id = randomBytes(6).toString('hex');
  const dir = projectDir(id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, SOURCE_NAME), Buffer.from(await video.arrayBuffer()));

  const project = await saveProject({
    id,
    title: z.string().min(1).catch('Untitled video').parse(body.title),
    createdAt: new Date().toISOString(),
    status: 'transcribing',
    language: SpokenLanguageSchema.parse(body.language ?? 'ur'),
    script: ScriptSchema.parse(body.script ?? 'roman'),
    templateId: 'signature',
    durationSec: 0,
    videoUri: `/files/${id}/${SOURCE_NAME}`,
  });
  startTranscription(id, SOURCE_NAME);
  return c.json(present(project, new URL(c.req.url).origin), 201);
});

app.patch('/projects/:id', async (c) => {
  const patch = PatchSchema.parse(await c.req.json());
  const project = await updateProject(c.req.param('id'), patch);
  return c.json(present(project, new URL(c.req.url).origin));
});

app.delete('/projects/:id', async (c) => {
  await deleteProject(c.req.param('id'));
  return c.body(null, 204);
});

app.post('/projects/:id/export', async (c) => {
  const id = c.req.param('id');
  const options = ExportSchema.parse(await c.req.json().catch(() => ({})));
  const current = await getProject(id);
  if (current.status === 'transcribing' || current.status === 'rendering') {
    return c.json({ error: `Project is busy (${current.status}).` }, 409);
  }
  const project = await updateProject(id, { status: 'rendering', error: undefined });
  startExport(id, SOURCE_NAME, options);
  return c.json(present(project, new URL(c.req.url).origin), 202);
});

/** Source videos and renders, with range requests for video players. */
app.use(
  '/files/*',
  serveStatic({
    root: path.relative(process.cwd(), projectsDir),
    rewriteRequestPath: (p) => p.replace(/^\/files/, ''),
  }),
);
