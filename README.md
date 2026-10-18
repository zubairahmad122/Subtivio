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
pnpm web          # open in the browser
pnpm dev          # Expo dev server (press i / a for simulators)
pnpm check        # typecheck + lint + tests
```

Without `apps/mobile/.env.local` the app runs in **demo mode** with a sample transcript. Copy `.env.example` to connect Supabase.

**Development build (live reload on your phone, recommended):**
1. Once: `pnpm build:dev`, then install the APK from the link it prints.
2. Every day: `pnpm dev`, open the Subtivio dev app on the phone and pick the server (or scan the QR code). Saved code changes appear on the phone instantly.

**Quick try without a build:** run `pnpm dev`, then scan the QR code with the Expo Go app (Android) or the Camera app (iPhone). Phone and computer must be on the same Wi-Fi; otherwise use `cd apps/mobile && npx expo start --tunnel`.

**Installable Android APK:** `pnpm build:apk` (needs a free Expo account; the build runs in the cloud and gives you a download link).
**iPhone build / App Store:** needs an Apple Developer account ($99/year), then `npx eas-cli@latest build -p ios`.

## Layout

| Path | What |
|---|---|
| `apps/mobile` | Expo Router app: screens, design system, features |
| `packages/core` | Shared caption logic: scripts, transcript, line grouping, templates, editing, SRT, plans (tested) |
| `supabase/migrations` | Postgres schema with row-level security |
| `docs/ARCHITECTURE.md` | System design, tech choices, build phases |
| `docs/COMPETITORS-2026-10.md` | Competitor re-check (Oct 2026) |
