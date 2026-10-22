# 0002 · A local JSON store, and Supabase later

**Date:** 2026-10-22 · **Status:** Accepted

## Decision

Keep settings, and soon food, in one small JSON file on the phone
(`apps/mobile/src/lib/store.ts`), written with `expo-file-system`. Write
weigh-ins and food to Apple Health rather than to the app's own store. Leave
Supabase until the laptop dashboard arrives, rather than doing it second in
Phase 1 as `CLAUDE.md` suggests.

## Why

- **It needs no new iOS build.** `expo-file-system` is already a dependency, so
  the store ships over the air. `expo-sqlite` and AsyncStorage both add native
  code, and every native change costs a 20–40 minute build plus a Sideloadly
  reinstall.
- **The data is tiny.** A year of food is roughly 1,800 rows. Reading that in
  one go is nothing; a database would be machinery without a job.
- **Apple Health is the real backup.** `WRITE_TYPES` in `health/healthkit.ts`
  already asks permission to write body mass and the four dietary types, so
  weigh-ins and meals can go straight into Health, which iCloud backs up. That
  removes the main argument for syncing to Supabase early.
- **Supabase earns its keep with a second device.** For one person on one
  phone it adds sign-in, sync and a `keepalive` workflow — needed because the
  free tier pauses after a quiet week — with nothing visible in return.

## What would change this

- Food logging gets slow, or the file grows past a megabyte or so → move the
  store behind the same interface to `expo-sqlite` (one native build).
- The laptop dashboard, or a second phone → Supabase becomes the sync target,
  as designed in `docs/DESIGN.md`.
- Wanting history that survives losing the phone *and* Apple Health → bring
  Supabase forward.
