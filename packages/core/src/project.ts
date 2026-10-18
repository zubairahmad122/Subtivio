import { z } from 'zod';

import { ScriptSchema } from './scripts';
import { SpokenLanguageSchema, TranscriptSchema } from './transcript';

/**
 * Lifecycle of one video. The worker moves a project forward; the app only
 * creates it and edits captions once it is `ready`.
 */
export const ProjectStatusSchema = z.enum([
  'uploading',
  'transcribing',
  'ready',
  'rendering',
  'exported',
  'failed',
]);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.iso.datetime(),
  status: ProjectStatusSchema,
  language: SpokenLanguageSchema,
  script: ScriptSchema,
  templateId: z.string(),
  durationSec: z.number().nonnegative(),
  /** Local file (before upload) or server URL (after). Absent for the demo project. */
  videoUri: z.string().optional(),
  /** Source video size in pixels, once the server has probed it. */
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  transcript: TranscriptSchema.optional(),
  /** URL of the last rendered MP4 with burned-in captions. */
  exportUrl: z.string().optional(),
  /** Why the last transcription or render failed. */
  error: z.string().optional(),
  /** Non-fatal information for the user, e.g. that a demo transcript was used. */
  notice: z.string().optional(),
});
export type Project = z.infer<typeof ProjectSchema>;
