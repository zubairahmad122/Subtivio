# Lafz Architecture

> Working name **Lafz** (لفظ, "word"). Rename freely: it lives in `app.json`, `package.json` names and a few UI strings.
> Last updated: 2026-10-18.

## 1. The one-paragraph version

One Expo codebase ships **web + iOS + Android**. The app uploads a reel, the backend **worker** transcribes it (ASR), writes every word in **Roman Urdu, Nastaliq and Devanagari** with the same timestamps, and the app shows a live caption preview you can restyle, re-script and edit. Final MP4s are rendered server-side with **Remotion**, and it reads the **same template spec** as the in-app preview. Supabase handles auth, Postgres and realtime status; Cloudflare R2 stores video.

## 2. A note on "mobile first"

The research (decision A5) says *don't build a native app first*, because Submagic grew to $8M ARR browser-only. You asked for React Native + Expo. Both fit:

- **Expo Router renders the same app to the web.** We launch on **web first** (agencies and editors work on desktop, and Lemon Squeezy checkout works there), then release to the stores from the same code.
- **The phone matters more for this market than for Submagic's.** Pakistani creators shoot and post on phones, and Bolti AI (the closest local rival) is app-only. A native app later is a real advantage, not a distraction.
- The editor already has a two-column desktop layout (≥900px) and a stacked phone layout.

## 3. System diagram

```
 ┌────────────────────── apps/mobile (Expo: iOS · Android · Web) ──────────────────────┐
 │ expo-router screens → TanStack Query hooks → ProjectRepository (demo | supabase)     │
 │ CaptionStage (live preview) ← @lafz/core (templates, grouping, scripts, editing)     │
 └───────────────┬───────────────────────────────┬──────────────────────────────────────┘
                 │ auth, rows, realtime          │ presigned PUT (video)
                 ▼                               ▼
        ┌─────────────────┐              ┌───────────────┐
        │ Supabase        │              │ Cloudflare R2 │  raw uploads auto-delete at 7 days
        │ Auth · Postgres │◄────jobs────►│ videos/exports│
        │ RLS · Realtime  │              └───────▲───────┘
        └───────▲─────────┘                      │
                │ pg-boss queue (in Postgres)    │
        ┌───────┴────────────────────────────────┴──────┐
        │ services/worker (Node, Docker on a VPS)        │  ← Phase 2
        │ 1. ASR: AssemblyAI Universal-2 (Urdu)          │
        │         Sarvam Saaras (Hinglish / Hindi)       │
        │ 2. Transliterate + normalise: Claude Haiku     │
        │    (JSON in/out, word count must not change)   │
        │ 3. Render: Remotion + @lafz/core templates     │
        │    Noto Nastaliq Urdu, watermark on Free       │
        └────────────────────────────────────────────────┘
 Billing webhooks: Lemon Squeezy (web) + RevenueCat (App Store / Play) → entitlements table
```

## 4. The caption pipeline

| Step | Where | Detail |
|---|---|---|
| 1. Pick | App | `expo-image-picker`, ≤60 s on Free, ≤180 s on paid plans (`PLANS` in core) |
| 2. Upload | App → R2 | Presigned PUT from a Supabase Edge Function; row `status = uploading` |
| 3. Transcribe | Worker | Native-script words + timestamps. Route by spoken language; benchmark word error rate (WER) on 30 real reels first (Action Plan Phase 1) |
| 4. Transliterate | Worker | LLM fills the other scripts **word-for-word**. If the word count changes, retry, then fall back to rule-based transliteration. Timings never change |
| 5. Personal spellings | App + worker | `applySpellingRules` (core): the creator's "he → hai" list. This is the moat |
| 6. Edit | App | `retextLine` (core): same word count keeps timings and other scripts; a different count re-splits the line's time span |
| 7. Export | Worker | Remotion renders the same `CaptionTemplate` with real text stroke. Upload to R2, return a signed URL. SRT via `toSrt` (core) |

**Why one transcript holds all three scripts:** the script toggle is instant and free (no second ASR call), and it can never drift out of sync.

## 5. Technology choices

| Layer | Choice | Why |
|---|---|---|
| App framework | **Expo SDK 58**, React Native 0.88, React 19.3, TypeScript 6 strict | Newest stable SDK; one codebase for 3 platforms; EAS builds without Xcode |
| Routing | **Expo Router** (typed routes), `NativeTabs` on native, custom floating tab bar on web | File-based routes; native tab bars (iOS liquid glass / Material) |
| Styling | **NativeWind 4.2** (Tailwind 3.4) + `cva` + `tailwind-merge` | Stable. v5 (Tailwind 4) is still RC; migrate when it ships stable |
| Components | Own shadcn-style primitives in `components/ui` | Full control of the premium look; no heavy UI kit |
| Theme | Tokens in `src/theme/tokens.ts` → CSS variables via `vars()` | One source of truth for `className` *and* JS (icons, gradients, navigation) |
| Server state | **TanStack Query 5** | Caching, polling while processing, optimistic edits |
| Client state | **Zustand 5** | Small, no boilerplate |
| Validation | **Zod 4** schemas in `@lafz/core` | Same types in app, worker and DB |
| Video | `expo-video` | Player time drives the caption overlay at 30 Hz |
| Fonts | Inter (UI), **Noto Nastaliq Urdu**, Noto Sans Devanagari (all OFL) | Nastaliq is the differentiator; no competitor markets it |
| Backend | **Supabase** (Auth, Postgres + RLS, Realtime, Edge Functions) | Least ops for a solo founder. Schema: `supabase/migrations` |
| Storage | **Cloudflare R2** | No egress fees for video |
| Queue | **pg-boss** (inside Postgres) | No Redis to run |
| ASR | AssemblyAI Universal-2 (~$0.0025/min, Urdu) + Sarvam Saaras (Hinglish) | From research Module 05; confirm with your own WER test |
| LLM | Claude Haiku | Cheap and fast for word-level transliteration |
| Render | **Remotion** (free for 1–3 person teams) on the worker | Browser text shaping makes Nastaliq correct; shares template data with the app |
| Web payments | **Lemon Squeezy** | Pays out to Pakistani banks (verified in research). Stripe owns it since 2024; keep **Paddle** as the backup |
| Mobile payments | **RevenueCat** + StoreKit / Play Billing | Apple and Google require in-app purchase for digital subscriptions bought inside the app |
| Quality | ESLint (expo flat config + React Compiler rules), Prettier + Tailwind plugin, Vitest | `pnpm check` runs everything |
| Monorepo | **pnpm workspaces**, hoisted `node_modules` | Expo auto-detects the workspace; hoisting avoids duplicate React |

## 6. Repository layout

```
lafz/
├── apps/mobile/                 Expo app (iOS · Android · Web)
│   ├── src/app/                 Routes only (expo-router)
│   │   ├── (tabs)/              Home · Styles · Settings
│   │   ├── project/new.tsx      Pick video → language → script
│   │   ├── project/[id].tsx     Processing state + editor
│   │   └── paywall.tsx          Plans + billing-trust promises
│   ├── src/components/ui/       Design-system primitives (Text, Button, Card, …)
│   ├── src/features/captions/   CaptionStage, CaptionLineView, ScriptToggle, LineList, clocks
│   ├── src/features/projects/   Repository interface, demo backend, query hooks
│   ├── src/features/settings/   Plan, appearance, spelling rules (Zustand)
│   ├── src/lib/                 env, supabase client, query client, cn, haptics
│   └── src/theme/               Tokens + ThemeProvider
├── packages/core/               Pure TS domain logic shared with the worker (+ Vitest tests)
├── supabase/migrations/         Postgres schema with RLS
└── docs/                        This file, competitor update, screenshots
```

**Rules of thumb**
- Route files stay thin: data comes from feature hooks, UI comes from `components/ui`.
- Anything both the app and the worker need (timing, templates, scripts, plans) goes in `@lafz/core` as **pure functions with tests**.
- Screens never import Supabase directly; they go through `ProjectRepository`. Moving off demo mode means changing one line in `features/projects/queries.ts`.
- No secrets in the app. `EXPO_PUBLIC_*` values are public; ASR, LLM and R2 keys live only on the worker.

## 7. Design system: "Ink & Saffron"

- **Dark-first, premium.** Warm near-black ink (`#0B0A09`), warm-paper light theme (`#FAF7F1`).
- **Saffron gold** (`#F4B740`) is the primary colour. It is also the default caption highlight, so the brand *is* the product.
- **Emerald** (`#34D399`) for success, privacy and the billing-trust promises.
- Rounded 24–32 px cards, Inter 800 display type, and the Nastaliq "لفظ" next to the wordmark.
- Follows the OS light/dark setting by default; you can override it in Settings.

## 8. Build phases (mapped to the Action Plan)

| Phase | Weeks | Scope | Status |
|---|---|---|---|
| 0. Foundation | 1 | Monorepo, design system, core domain + tests, all screens on demo data, DB schema | **Done (this commit)** |
| 1. Pipeline spike | 1–2 | `services/worker` script: R2 upload → AssemblyAI → Haiku transliteration → JSON. Run the 30-reel WER test, and use it for the Fiverr gigs | Next |
| 2. Real backend | 3–4 | Supabase auth (Google + email), `SupabaseProjectRepository`, presigned uploads, pg-boss jobs, Realtime status | |
| 3. Export | 4–5 | Remotion composition reading `CaptionTemplate`, watermark, SRT download | |
| 4. Money | 5–6 | Lemon Squeezy checkout + webhooks → `entitlements`; usage limits from `usage_events` | |
| 5. Launch | 7–8 | Web launch + Product Hunt; then an EAS build with RevenueCat for the App Store and Play | |
| 6. Agency | 9–12 | Team seats, brand kits, batch upload, API (Submagic-style `POST /projects`) | |

## 9. Known limitations and risks

- **Text stroke:** React Native can't draw a real text stroke, so the preview approximates it with a shadow. The Remotion export draws a true stroke.
- **Nastaliq line height** needs about 2.1× the font size (`SCRIPTS.urdu.lineHeight`). Check it on real Android devices; Android font padding varies.
- **SEO:** the Expo web app is not the marketing site. Build SEO landing pages ("Roman Urdu caption generator", …) as a separate static site later, as the research's programmatic SEO plan suggests.
- **NativeWind v5:** when it is stable, migrate to Tailwind 4. The tokens file stays the same.
- **Demo mode** is active whenever `EXPO_PUBLIC_SUPABASE_URL` is unset. New projects get the sample transcript after about 3 s.
