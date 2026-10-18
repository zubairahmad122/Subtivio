# Subtivio

AI captions for reels in **Roman Urdu, Urdu (Nastaliq) and Hindi**, from one recording with word-by-word highlight.
Built with Expo (iOS · Android · Web), NativeWind and Supabase.

<p>
  <img src="docs/screenshots/home-dark.png" width="200" />
  <img src="docs/screenshots/editor-urdu.png" width="200" />
  <img src="docs/screenshots/templates-urdu.png" width="200" />
  <img src="docs/screenshots/paywall.png" width="200" />
</p>

## Quick start

```bash
pnpm install
pnpm run server       # terminal 1: API + transcription + MP4 rendering (port 8787)
pnpm android      # terminal 2: build + install on a USB phone, live reload
pnpm web          # or: open the app in the browser
pnpm check        # typecheck + lint + tests
```

### The server (`services/server`)

The app finds the server automatically on the same machine as the Expo dev server. It does the real work:

| Step | How | Needs |
|---|---|---|
| Upload + video info | Saves to `services/server/data/`, ffprobe | ffmpeg 7+ with libass |
| Speech to text | AssemblyAI (best word timings); Gemini takes over if it fails or has no key | `ASSEMBLYAI_API_KEY`, `GEMINI_API_KEY` |
| Roman / Nastaliq / Hindi for every word | Gemini (free tier, auto-switches model on quota) or Claude Haiku | `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` |
| MP4 with burned-in captions | `@subtivio/core` → ASS subtitles → ffmpeg + libass | Fonts are bundled |

Copy `services/server/.env.example` to `services/server/.env` and add your keys. Without keys it still runs end to end with a demo transcript, so you can test upload, editing and export.

ffmpeg note: Ubuntu 24.04's ffmpeg 6.1 draws Nastaliq as empty boxes; Arch/CachyOS ffmpeg is fine. On older distros set `FFMPEG_PATH`/`FFPROBE_PATH` to a newer static build.

If no server answers, the app falls back to **demo mode** with in-memory sample data.

**On your Android phone (local build, no Expo cloud):** needs Android Studio / Android SDK and JDK 17, and the phone connected by USB with USB debugging on.

| Command | What it does |
|---|---|
| `pnpm android` | Builds the debug app, installs it on the phone and starts the dev server. Saved code changes appear live. Run it again only after adding a native package. |
| `pnpm dev` | Starts the dev server only, once the debug app is already installed. |
| `pnpm build:apk` | Builds a standalone release APK (no dev server needed) to share with testers. |
| `pnpm install:apk` | Installs that release APK on the USB-connected phone. |

## Layout

| Path | What |
|---|---|
| `apps/mobile` | Expo Router app: screens, design system, features |
| `packages/core` | Shared caption logic: scripts, transcript, line grouping, templates, editing, SRT/ASS export, plans (tested) |
| `services/server` | Local API + worker: upload, transcription, script conversion, MP4 rendering |
| `supabase/migrations` | Postgres schema with row-level security |
| `docs/ARCHITECTURE.md` | System design, tech choices, build phases |
| `docs/COMPETITORS-2026-10.md` | Competitor re-check (Oct 2026) |
