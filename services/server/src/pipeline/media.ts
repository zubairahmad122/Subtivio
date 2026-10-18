import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { env } from '../env';

/** Runs a command and resolves with stdout; rejects with the tail of stderr. */
function run(cmd: string, args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr = (stderr + d).slice(-4000)));
    child.on('error', (err) =>
      reject(new Error(`${cmd} could not start (${err.message}). Is it installed?`)),
    );
    child.on('close', (code) =>
      code === 0 ? resolve(stdout) : reject(new Error(`${cmd} failed: ${stderr.trim()}`)),
    );
  });
}

export type VideoInfo = { durationSec: number; width: number; height: number };

/** Duration and displayed size (rotation applied, as ffmpeg decodes it). */
export async function probe(file: string): Promise<VideoInfo> {
  const out = await run(env.FFPROBE_PATH, [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height:stream_side_data=rotation:stream_tags=rotate:format=duration',
    '-of',
    'json',
    file,
  ]);
  const json = JSON.parse(out) as {
    streams?: {
      width?: number;
      height?: number;
      tags?: { rotate?: string };
      side_data_list?: { rotation?: number }[];
    }[];
    format?: { duration?: string };
  };
  const stream = json.streams?.[0];
  if (!stream?.width || !stream.height) throw new Error('No video stream found in this file.');

  const rotation = Math.abs(
    Number(
      stream.side_data_list?.find((s) => s.rotation !== undefined)?.rotation ??
        stream.tags?.rotate ??
        0,
    ),
  );
  const sideways = rotation === 90 || rotation === 270;
  return {
    durationSec: Number(json.format?.duration ?? 0),
    width: sideways ? stream.height : stream.width,
    height: sideways ? stream.width : stream.height,
  };
}

const FONT_FILES = [
  '@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
  '@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf',
  '@expo-google-fonts/noto-nastaliq-urdu/400Regular/NotoNastaliqUrdu_400Regular.ttf',
  '@expo-google-fonts/noto-nastaliq-urdu/700Bold/NotoNastaliqUrdu_700Bold.ttf',
  '@expo-google-fonts/noto-sans-devanagari/600SemiBold/NotoSansDevanagari_600SemiBold.ttf',
  '@expo-google-fonts/noto-sans-devanagari/700Bold/NotoSansDevanagari_700Bold.ttf',
];

export const fontsDir = path.join(env.DATA_DIR, 'fonts');

/** Copies the caption fonts next to the data so libass can load them by name. */
export async function prepareFonts(): Promise<void> {
  const require = createRequire(import.meta.url);
  await fs.mkdir(fontsDir, { recursive: true });
  await Promise.all(
    FONT_FILES.map((spec) =>
      fs.copyFile(require.resolve(spec), path.join(fontsDir, path.basename(spec))),
    ),
  );
}

/**
 * Burns `captions.ass` into the source video. Runs inside the project folder
 * so the subtitle filter argument needs no path escaping.
 */
export async function burnCaptions(projectDir: string, sourceName: string): Promise<void> {
  await run(
    env.FFMPEG_PATH,
    [
      '-y',
      '-i',
      sourceName,
      '-map',
      '0:v:0',
      '-map',
      '0:a?',
      '-vf',
      `subtitles=captions.ass:fontsdir=${fontsDir.replaceAll(':', '\\:')}`,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      '-movflags',
      '+faststart',
      'export.tmp.mp4',
    ],
    projectDir,
  );
  await fs.rename(path.join(projectDir, 'export.tmp.mp4'), path.join(projectDir, 'export.mp4'));
}
