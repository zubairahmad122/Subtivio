import fs from 'node:fs/promises';
import path from 'node:path';

import {
  applySpellingRules,
  applyStyle,
  getTemplate,
  toAss,
  type SpellingRule,
} from '@subtivio/core';

import { burnCaptions, probe } from './pipeline/media';
import { NATIVE_SCRIPT, transcribe } from './pipeline/transcribe';
import { transliterate } from './pipeline/transliterate';
import { getProject, listProjects, projectDir, updateProject } from './store';

/**
 * One job at a time: ffmpeg and the ASR upload are heavy, and a laptop
 * running both in parallel for several videos slows everything down.
 */
let queue: Promise<unknown> = Promise.resolve();
function enqueue(task: () => Promise<void>) {
  queue = queue.then(task).catch((err) => console.error(err));
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

export function startTranscription(id: string, sourceName: string) {
  enqueue(async () => {
    try {
      const project = await getProject(id);
      const dir = projectDir(id);
      const info = await probe(path.join(dir, sourceName));
      await updateProject(id, {
        durationSec: info.durationSec,
        width: info.width,
        height: info.height,
      });

      const asr = await transcribe(dir, sourceName, project.language, info.durationSec);
      // Demo and Gemini transcripts already carry every script.
      const converted = asr.allScripts
        ? { words: asr.words, complete: true }
        : await transliterate(asr.words, NATIVE_SCRIPT[project.language]);

      const notices = [
        asr.engine === 'demo' &&
          'Demo transcript: add ASSEMBLYAI_API_KEY or GEMINI_API_KEY to the server for real captions.',
        asr.engine === 'gemini' &&
          `Transcribed by Gemini (${asr.model}). Word timing is approximate; tap a line to fix it if needed.`,
        !converted.complete &&
          'Some words are only in the original script: add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY to the server for Roman/Urdu/Hindi conversion.',
      ].filter(Boolean);

      await updateProject(id, {
        status: 'ready',
        transcript: { language: project.language, words: converted.words },
        notice: notices.join(' ') || undefined,
        error: undefined,
      });
    } catch (err) {
      await updateProject(id, { status: 'failed', error: message(err) }).catch(() => {});
    }
  });
}

export type ExportOptions = { watermark: boolean; spellingRules: SpellingRule[] };

export function startExport(id: string, sourceName: string, options: ExportOptions) {
  enqueue(async () => {
    try {
      const project = await getProject(id);
      if (!project.transcript || !project.width || !project.height) {
        throw new Error('Captions are not ready yet.');
      }
      const words = applySpellingRules(
        project.transcript.words,
        options.spellingRules,
        project.script,
      );
      const ass = toAss({
        words,
        script: project.script,
        template: applyStyle(getTemplate(project.templateId), project.style),
        width: project.width,
        height: project.height,
        watermark: options.watermark,
      });
      const dir = projectDir(id);
      await fs.writeFile(path.join(dir, 'captions.ass'), ass);
      await burnCaptions(dir, sourceName);
      await updateProject(id, {
        status: 'exported',
        // Cache-bust so a re-export is not served from an old download.
        exportUrl: `/files/${id}/export.mp4?v=${Date.now()}`,
        error: undefined,
      });
    } catch (err) {
      await updateProject(id, { status: 'ready', error: `Export failed: ${message(err)}` }).catch(
        () => {},
      );
    }
  });
}

/** Jobs live in memory; anything mid-flight when the server stopped is marked as such. */
export async function recoverInterruptedJobs() {
  for (const p of await listProjects()) {
    if (p.status === 'transcribing' || p.status === 'uploading') {
      await updateProject(p.id, {
        status: 'failed',
        error: 'The server restarted during transcription.',
      });
    } else if (p.status === 'rendering') {
      await updateProject(p.id, { status: 'ready', error: 'The server restarted during export.' });
    }
  }
}
