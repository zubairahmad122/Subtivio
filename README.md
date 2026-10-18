# Lafz · لفظ

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
pnpm web          # open in the browser
pnpm dev          # Expo dev server (press i / a for simulators)
pnpm check        # typecheck + lint + tests
```

Without `apps/mobile/.env.local` the app runs in **demo mode** with a sample transcript. Copy `.env.example` to connect Supabase.

Native modules (expo-video, image picker, secure store) need a development build:
`npx eas-cli@latest build --profile development`, or `npx expo run:ios|android` locally.

## Layout

| Path | What |
|---|---|
| `apps/mobile` | Expo Router app: screens, design system, features |
| `packages/core` | Shared caption logic: scripts, transcript, line grouping, templates, editing, SRT, plans (tested) |
| `supabase/migrations` | Postgres schema with row-level security |
| `docs/ARCHITECTURE.md` | System design, tech choices, build phases |
| `docs/COMPETITORS-2026-10.md` | Competitor re-check (Oct 2026) |
