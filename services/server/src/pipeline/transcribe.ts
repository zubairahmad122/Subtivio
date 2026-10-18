import fs from 'node:fs';

import { SAMPLE_TRANSCRIPT, type Script, type SpokenLanguage, type Word } from '@subtivio/core';

import { env } from '../env';

const API = 'https://api.assemblyai.com/v2';

/** Script the ASR writes each spoken language in. Punjabi is assumed Shahmukhi (Pakistan). */
const NATIVE_SCRIPT: Record<SpokenLanguage, Script> = {
  ur: 'urdu',
  pa: 'urdu',
  hi: 'hindi',
  en: 'roman',
};

export type TranscribeResult = { words: Word[]; mock: boolean };

type AssemblyTranscript = {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  error?: string;
  words?: { text: string; start: number; end: number; confidence: number }[];
};

async function assembly<T>(pathname: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${pathname}`, {
    ...init,
    headers: { authorization: env.ASSEMBLYAI_API_KEY!, ...init.headers },
  });
  if (!res.ok) throw new Error(`AssemblyAI ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

/**
 * Speech to timed words in the spoken language's native script. AssemblyAI
 * takes the video file directly and extracts the audio itself. Without an API
 * key this returns the bundled sample so the rest of the pipeline still runs.
 */
export async function transcribe(
  file: string,
  language: SpokenLanguage,
): Promise<TranscribeResult> {
  if (!env.ASSEMBLYAI_API_KEY) return { words: SAMPLE_TRANSCRIPT.words, mock: true };

  const { upload_url } = await assembly<{ upload_url: string }>('/upload', {
    method: 'POST',
    headers: { 'content-type': 'application/octet-stream' },
    // A file-backed Blob streams from disk instead of loading the video into memory.
    body: await fs.openAsBlob(file),
  });

  let job = await assembly<AssemblyTranscript>('/transcript', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ audio_url: upload_url, language_code: language, punctuate: true }),
  });

  const deadline = Date.now() + 15 * 60_000;
  while (job.status === 'queued' || job.status === 'processing') {
    if (Date.now() > deadline) throw new Error('Transcription timed out.');
    await new Promise((r) => setTimeout(r, 2000));
    job = await assembly<AssemblyTranscript>(`/transcript/${job.id}`);
  }
  if (job.status === 'error')
    throw new Error(`Transcription failed: ${job.error ?? 'unknown error'}`);

  const script = NATIVE_SCRIPT[language];
  const words = (job.words ?? []).map((w, i): Word => ({
    id: `w${i}`,
    start: w.start / 1000,
    end: w.end / 1000,
    confidence: w.confidence,
    text: { [script]: w.text },
  }));
  if (words.length === 0) throw new Error('No speech was found in this video.');
  return { words, mock: false };
}

export { NATIVE_SCRIPT };
