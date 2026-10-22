# Baseline — notes for Claude Code

Baseline is Will's private iPhone health app. It reads Apple Health (fed by an Amazfit Helio Strap through the Zepp app) and turns it into recovery, sleep, strain, calories and training numbers. It must stay **£0 to build, install and update**: no paid Apple account, free tiers only. The full design is in `docs/DESIGN.md`; read the relevant section before starting a feature.

Will develops on **Windows** and is learning as he goes. Explain what you're about to change and why before you change it, keep explanations plain, and add a short entry to `docs/learning-log.md` after each piece of work.

## Where things are

```
apps/mobile/          Expo app (SDK 58, React Native 0.88, Expo Router, TypeScript strict)
  src/app/            Screens. Every file is a route. (tabs)/ = the five tabs; step0.tsx = Step 0 check
  src/health/         HealthService interface + HealthKit implementation + fake (sample data)
  src/components/     UI pieces (ui.tsx, RecoveryDial.tsx, ComingSoon.tsx)
  src/lib/build.ts    OTA marker, update status, signing expiry
  src/theme.ts        Colours, spacing, type. One colour per meaning.
  AGENTS.md           Expo's own guidance. Read it: Expo APIs change every SDK.
packages/core/        ALL metric maths. Pure functions, no I/O, unit-tested with Vitest.
supabase/migrations/  Database schema with Row Level Security (not connected yet: Phase 1)
.github/workflows/    test.yml, ios-build.yml (unsigned .ipa), ota-update.yml (EAS Update)
docs/                 DESIGN.md, SETUP.md (Windows setup), decisions/, learning-log.md
```

## Commands (run from the repo root unless noted)

| What | Command |
| --- | --- |
| Install | `npm install` |
| Unit tests | `npm test` |
| Type-check everything | `npm run typecheck` |
| Web preview with sample data (works on Windows) | `npm run web` |
| Dev server for a development build on the phone | `npm run mobile` |
| Native fingerprint (does this change need a rebuild?) | `cd apps/mobile && npx expo-updates fingerprint:generate --platform ios` |
| Add an Expo package | `cd apps/mobile && npx expo install <pkg>` (never plain `npm install` for Expo/RN packages) |

iOS builds can't run on Windows. They happen on GitHub: Actions → **iOS build (unsigned)**. Over-the-air updates publish automatically on every push to `main` (Actions → **OTA update**).

## Rules

1. **Maths lives in `packages/core`.** Screens render numbers; they never calculate scores. Every new formula gets tests in `packages/core/test`. Keep weights and thresholds as named constants with a comment saying where they came from.
2. **Apple Health only through `HealthService`** (`apps/mobile/src/health`). Add new reads to both `healthkit.ts` and `fake.ts`, and add the type to `READ_QUANTITIES` so Step 0 probes it. Requesting a type that isn't in the permission list crashes the app.
3. **Native changes need a rebuild.** Adding a native library, a HealthKit type, a config plugin, an app.json change, or a widget changes the fingerprint. Say so clearly in your summary: "This needs a new iOS build", and remind Will to run the workflow and reinstall with Sideloadly. Prefer JavaScript-only changes when there's a choice.
4. **Free signing limits.** No push notifications (`aps-environment`), no HealthKit background delivery entitlement, no Sign in with Apple, no iCloud. Anything that adds an entitlement must be tested on the phone before building on it. Check `apps/mobile/ios/Baseline/Baseline.entitlements` after `npx expo prebuild` if unsure.
5. **No secrets in the repo.** API keys go in Supabase secrets or GitHub Actions secrets. `EXPO_PUBLIC_*` variables are bundled into the app, so never put a secret in one.
6. **TypeScript strict, no `any`.** `noUncheckedIndexedAccess` is on. The few `as never` casts in `healthkit.ts` work around the library's unit generics; don't spread them elsewhere.
7. **Style**: dark theme tokens from `src/theme.ts` only; British English in UI text ("colour", "kg", "en-GB" number formatting); big number first, explanation underneath.

## Definition of done

- `npm test` and `npm run typecheck` pass.
- New maths has tests; new screens work in the web preview with sample data.
- Summary says whether a new iOS build is needed.
- `docs/learning-log.md` has a few lines on what changed and one thing worth understanding about it.
- If Will is asked to do something on his phone or in a browser, give numbered steps.

## Status

- **Done:** monorepo, `packages/core` (recovery, sleep, strain, energy, weight trend, real TDEE, illness, macros, strength, Today summary; 60 tests), app skeleton with dark tabs, Today screen reading Apple Health, Step 0 check screen, Supabase schema, build and update workflows.
- **Now: Step 0** (docs/SETUP.md). Will installs the first build and shares the Step 0 report. Fix whatever it shows before starting Phase 1.
- **Next: Phase 1, calories** (docs/DESIGN.md "Roadmap"). Suggested order:
  1. Settings screen: profile (sex, height, birth year), units, sleep target, calorie target. Store locally first.
  2. Supabase: create the project, apply the migration, email one-time-code sign-in, sync `daily_metrics`. Add the `keepalive` workflow.
  3. Food tab: quick add, then Open Food Facts search and barcode (expo-camera; send a custom User-Agent; credit Open Food Facts on screen), saved meals, copy yesterday.
  4. Calories in vs out on Today, protein and macros bars, write food to Apple Health.
  5. `estimate-food` Edge Function with the Claude API behind the monthly cap, then the photo flow.
- **Later:** Phase 2 recovery (mood check-in, widget, morning notification), Phase 3 training + AI + web dashboard, Phase 4 friends.

## Things learned the hard way

- `npx expo install` needs network access to Expo's API; if it fails behind a proxy, `EXPO_OFFLINE=1 npx expo install <pkg>` uses the version list bundled with the SDK.
- The unsigned build is ad-hoc signed with the entitlements file so Sideloadly can see the app needs HealthKit. If Step 0 shows HealthKit unavailable on the phone, start there.
- Fingerprints are computed before `expo prebuild` in CI so the build and the OTA update agree.
