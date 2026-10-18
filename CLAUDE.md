# Subtivio

pnpm monorepo. Read `docs/ARCHITECTURE.md` first; Expo-specific rules are in `apps/mobile/AGENTS.md`.

- Shared caption logic goes in `packages/core` as pure functions, with Vitest tests next to it.
- Screens use `@/features/*` hooks and `@/components/ui/*`; never call Supabase from a route file.
- Colours come only from `apps/mobile/src/theme/tokens.ts` (Tailwind classes like `bg-primary`, or `useTheme().colors`).
- Add native packages with `npx expo install` (set `EXPO_OFFLINE=1` if the Expo API is unreachable).
- Before finishing: `pnpm check`.
