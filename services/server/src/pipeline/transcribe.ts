import fs from 'node:fs';
import path from 'node:path';

import { SAMPLE_TRANSCRIPT, type Script, type SpokenLanguage, type Word } from '@subtivio/core';
import { z } from 'zod';

import { env } from '../env';
import { geminiPool, gemini } from './gemini';
import { extractAudio } from './media';
import { SegmentsSchema, segmentsToWords } from './segments';

/** Script the ASR writes each spoken language in. Punjabi is assumed Shahmukhi (Pakistan). */
const NATIVE_SCRIPT: Record<SpokenLanguage, Script> = {
  ur: 'urdu',
  pa: 'urdu',
  hi: 'hindi',
  en: 'roman',
};

const LANGUAGE_NAME: Record<SpokenLanguage, string> = {
  ur: 'Urdu',
  pa: 'Punjabi',
  hi: 'Hindi',
  en: 'English',
};

export type TranscribeResult = {
  words: Word[];
  /** Which engine produced the words; `demo` means the bundled sample. */
  engine: 'assemblyai' | 'gemini' | 'demo';
  /** True when every word already has Roman, Urdu and Hindi text. */
  allScripts: boolean;
  /** Gemini model that answered, for logs and notices. */
  model?: string;
};

export function transcriptionEngine(): TranscribeResult['engine'] {
  if (env.ASSEMBLYAI_API_KEY) return 'assemblyai';
  if (env.GEMINI_API_KEY) return 'gemini';
  return 'demo';
}

/**
 * Speech to timed words. AssemblyAI gives the most accurate word timings, so
 * it goes first; if it fails (e.g. credit used up) and a Gemini key is set,
 * Gemini's free models take over. Without keys the bundled sample keeps the
 * rest of the pipeline testable.
 */
export async function transcribe(
  projectDir: string,
  sourceName: string,
  language: SpokenLanguage,
  durationSec: number,
): Promise<TranscribeResult> {
  switch (transcriptionEngine()) {
    case 'assemblyai':
      try {
        return {
          words: await assemblyTranscribe(path.join(projectDir, sourceName), language),
          engine: 'assemblyai',
          allScripts: false,
        };
      } catch (error) {
        if (!env.GEMINI_API_KEY) throw error;
        console.warn(`AssemblyAI failed (${(error as Error).message}); using Gemini instead.`);
        return geminiTranscribe(projectDir, sourceName, language, durationSec);
      }
    case 'gemini':
      return geminiTranscribe(projectDir, sourceName, language, durationSec);
    case 'demo':
      if (!env.DEMO_TRANSCRIPT) {
        throw new Error(
          'No transcription key on the server. Put ASSEMBLYAI_API_KEY or GEMINI_API_KEY in services/server/.env and restart "pnpm run server".',
        );
      }
      return { words: SAMPLE_TRANSCRIPT.words, engine: 'demo', allScripts: true };
  }
}

// ---------------------------------------------------------------- Gemini

const GEMINI_SYSTEM = `You transcribe speech from short social-media videos for captions.
Listen to the whole audio. Write down every spoken word exactly as said; never translate, summarise, or invent words. Ignore music and background noise. If there is no speech, return an empty "segments" list.
Split the speech into short phrases of at most 8 words, breaking at natural pauses. For each phrase give "start" and "end" in seconds from the beginning of the audio (decimals allowed), as precisely as you can.
For every word, give it in three scripts:
- urdu: Urdu in Arabic script (Nastaliq). English words written phonetically in Urdu script.
- roman: Roman Urdu as Pakistani creators type it on Instagram and TikTok (e.g. "hai", "kya", "nahi", "yaar", "main", "aap"). English words in normal English spelling.
- hindi: Devanagari. English words written phonetically in Devanagari.
Keep punctuation attached to the word it follows.`;

const segmentsJsonSchema = z.toJSONSchema(SegmentsSchema);

async function geminiTranscribe(
  projectDir: string,
  sourceName: string,
  language: SpokenLanguage,
  durationSec: number,
): Promise<TranscribeResult> {
  const audio = await extractAudio(projectDir, sourceName);
  const data = (await fs.promises.readFile(audio)).toString('base64');

  const { result, model } = await geminiPool.run('transcribe', async (model) => {
    const response = await gemini().models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'audio/mpeg', data } },
            {
              text: `The speaker mostly uses ${LANGUAGE_NAME[language]}, possibly mixed with English or other languages. The audio is ${durationSec.toFixed(1)} seconds long.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: GEMINI_SYSTEM,
        responseMimeType: 'application/json',
        responseJsonSchema: segmentsJsonSchema,
        maxOutputTokens: 32768,
      },
    });
    const parsed = SegmentsSchema.safeParse(JSON.parse(response.text ?? 'null'));
    if (!parsed.success) throw new Error('Gemini returned captions in an unexpected format.');
    return { value: parsed.data, tokens: response.usageMetadata?.totalTokenCount };
  });

  const words = segmentsToWords(result, durationSec);
  if (words.length === 0) throw new Error('No speech was found in this video.');
  return { words, engine: 'gemini', allScripts: true, model };
}

// ------------------------------------------------------------ AssemblyAI

const ASSEMBLY_API = 'https://api.assemblyai.com/v2';

type AssemblyTranscript = {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  error?: string;
  words?: { text: string; start: number; end: number; confidence: number }[];
};

async function assembly<T>(pathname: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${ASSEMBLY_API}${pathname}`, {
    ...init,
    headers: { authorization: env.ASSEMBLYAI_API_KEY!, ...init.headers },
  });
  if (!res.ok) throw new Error(`AssemblyAI ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

/** AssemblyAI takes the video file directly and extracts the audio itself. */
async function assemblyTranscribe(file: string, language: SpokenLanguage): Promise<Word[]> {
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
  if (job.status === 'error') {
    throw new Error(`Transcription failed: ${job.error ?? 'unknown error'}`);
  }

  const script = NATIVE_SCRIPT[language];
  const words = (job.words ?? []).map((w, i): Word => ({
    id: `w${i}`,
    start: w.start / 1000,
    end: w.end / 1000,
    confidence: w.confidence,
    text: { [script]: w.text },
  }));
  if (words.length === 0) throw new Error('No speech was found in this video.');
  return words;
}

export { NATIVE_SCRIPT };
