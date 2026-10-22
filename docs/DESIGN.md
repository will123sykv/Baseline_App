# Baseline — Design Document (Free iPhone Build)

Snapshot of the design doc agreed on 22 October 2026. Live version with diagrams: https://claude.ai/artifact/VfvgLBgV32DtiSbv3GgNHV

## Overview

A private iPhone app that reads Apple Health and turns it into a daily recovery score, calorie balance and training picture. Building, installing and updating it costs £0. The only paid items are optional: AI food-photo estimates (pennies per use, hard-capped) and the Helio Strap itself.

**Goals**

- Show how recovered you are each morning as one score, with the reasons behind it.
- Track calories eaten vs burned, protein and macros, and learn your real maintenance calories.
- Track sleep, training load, strength workouts, steps and mood in one place.
- Ship every change from Claude Code without paying Apple.

**What the £0 constraint means**

- No Apple Developer Program. The app is signed with a free Apple ID and sideloaded from your Windows PC, then re-signed every 7 days.
- Free tiers only: GitHub, Expo, Supabase and Open Food Facts.
- AI is opt-in. Every core feature has a free path.

**Not in scope for now**

- App Store release or Android.
- Medical-grade accuracy. Scores compare you with your own baseline; they are not diagnoses.
- Friends installing the app. That needs the paid Apple account, covered in the Friends section.

## Requirements and decisions

| Area | Decision |
| --- | --- |
| Phone | iPhone, data from Apple Health |
| Dev machine | Windows PC running Claude Code |
| Wearable | Amazfit Helio Strap (screenless, no subscription) |
| Version 1 focus | Calories in and out |
| Food logging | Photo → AI estimate, which you confirm or edit |
| Training | Gym / strength; new to regular training |
| Goal | General health |
| Metrics | Recovery, calories in/out, sleep score and consistency, strain, weight trend and real TDEE, illness warning, protein and macros, strength log, steps, mood/energy check-in |
| AI | Daily written summary and chat with your data, for you only |
| Attention | Home screen widget and a morning recovery notification |
| Look | Dark, data-dense, Whoop-style |
| Sharing | Later: friends get their own copy, with leaderboards and challenges |
| Second device | Laptop web dashboard |
| Cost | £0 to get working; pay Apple only if the free path fails or friends join |
| Your role | Learn as you go: Claude explains, you make some changes |
| App name | Baseline |
| Repo | Public GitHub repo (unlimited free macOS builds) |

## Cost breakdown

Every service the app needs has a free tier that comfortably covers one person. The two limits that need designing around are Apple's 7-day signing and GitHub's macOS build minutes.

| Item | Cost | Free limit that matters | How the design handles it |
| --- | --- | --- | --- |
| Apple ID signing ([Corellium](https://support.corellium.com/features/apps/sideloadly)) | £0 | App expires after 7 days; 10 App IDs per 4 days; 3 devices per 7 days | Auto-refresh from your PC; app plus widget uses only 2 App IDs |
| Sideloadly | £0 | Free Apple IDs can run 3 sideloaded apps at once | This app uses 1 of the 3 |
| GitHub Actions macOS builds ([CICDCost](https://cicdcost.com/github-actions-pricing)) | £0 | Unlimited on a public repo; 2,000 minutes on a private repo, about 200 of them on macOS | Native builds only when native code changes; everything else ships over the air |
| Expo EAS Update ([Expo](https://expo.dev/pricing.md)) | £0 | 1,000 monthly users, 100 GiB bandwidth; the free plan stops at its limit, it never bills | One user, small updates |
| Supabase ([Automation Atlas](https://automationatlas.io/answers/supabase-free-tier-limits-2026/)) | £0 | 500 MB database, 1 GB files, 500,000 function calls a month; pauses after a week with no requests | Daily syncs keep it awake; food photos shrunk and deleted after 30 days |
| Open Food Facts | £0 | Open database, no account needed | Free barcode and food search |
| Laptop web dashboard hosting | £0 | Static site on a free host | No server code |
| Claude API (optional) | Pay per use | No free tier assumed | Off until you add a key; hard monthly cap in the app |
| Amazfit Helio Strap | £99.99 one-off | Not needed to start | App works on phone data alone until it arrives |

## System architecture

The app reads everything from Apple Health and talks to four free cloud services. The only step that needs your PC is installing a new native build.

```
Helio Strap ──Bluetooth──▶ Zepp app ──▶ Apple Health ◀──▶ Baseline app ──▶ Widget
                                                             │  │  │
                    ┌────────────────────────────────────────┘  │  └──────────────┐
                    ▼                                           ▼                 ▼
             Open Food Facts                              Supabase ─────▶ Claude API (optional)
             (barcodes, search)                     (sign-in, database,        (photos, summaries)
                                                     photos, functions)
                    Expo EAS Update ──over-the-air JS──▶ Baseline app
                          ▲                                   ▲
                          │ publishes updates                 │ reads data
Windows PC (Claude Code, Sideloadly) ◀──code / .ipa──▶ GitHub (code, Actions)   Laptop dashboard
          │
          └── Sideloadly installs a new build (only when native code changes)
```

Daily summaries sync both ways between the app and Supabase; raw heart-rate data never leaves the phone.

## Data sources

Apple Health is the single source of truth: the app never talks to the strap or to Zepp directly. The chain is Helio Strap → Zepp app (Bluetooth) → Apple Health → this app (HealthKit). Zepp added HRV syncing to Apple Health in a 2025 update, though some users didn't see the option straight away ([Notebookcheck](https://www.notebookcheck.net/Amazfit-brings-new-HRV-data-sharing-feature-to-wearable.1149080.0.html)).

| Apple Health type | Comes from | Read or write | Used for |
| --- | --- | --- | --- |
| Heart rate variability | Helio via Zepp | Read | Recovery, illness warning |
| Resting heart rate | Helio via Zepp | Read | Recovery, illness warning |
| Heart rate samples | Helio via Zepp | Read | Strain (time in zones) |
| Sleep analysis (stages) | Helio via Zepp | Read | Sleep score, recovery |
| Active energy | Helio and iPhone | Read | Calories out |
| Resting (basal) energy | Helio, else calculated | Read | Calories out |
| Steps | iPhone and Helio | Read | Steps |
| Workouts | Zepp and this app | Read and write | Strain, strength log |
| Body mass | This app or a smart scale | Read and write | Weight trend, real TDEE |
| Respiratory rate, blood oxygen | Zepp, if it writes them | Read | Illness warning (optional input) |
| Dietary energy, protein, carbs, fat | This app | Write | Keeps Apple Health complete |

**Rules for handling the data**

- **One source per type.** Steps and active energy arrive from both the iPhone and the strap. Daily totals use HealthKit's statistics queries, which merge overlapping sources by the priority order you set in the Health app (Zepp first).
- **Only new data.** Each sync uses HealthKit anchors, so it fetches only samples added since the last sync.
- **Raw stays on the phone.** Second-by-second heart rate is processed on the phone. Only daily summaries (one row per day) go to the backend.
- **HRV is compared only with itself.** Apple Health labels HRV as SDNN, and Zepp's method may differ. The app only ever compares today's value with your own history from the same source.
- **Missing days are normal.** Every metric has a fallback when an input is missing (see Metrics).

**Library:** [@kingstinct/react-native-healthkit](https://www.npmjs.com/package/%40kingstinct%2Freact-native-healthkit) has an Expo config plugin that sets the HealthKit entitlement and permission text. It doesn't run in Expo Go, so the app uses its own development build.

## Metrics and algorithms

Every score compares you with your own recent history, not with population averages. Scores need 14 days of data before they show; until then the app shows raw values marked "calibrating". All maths lives in one tested package (`packages/core`) so the phone, web dashboard and AI see identical numbers. Weights below are starting values to tune once real data exists.

| Metric | Inputs | Method | Shown as |
| --- | --- | --- | --- |
| Recovery | HRV, resting HR, sleep score, mood check-in | Weighted z-scores vs your 30-day baseline, mapped to 0–100 | Dial: green ≥ 67, amber 34–66, red ≤ 33 |
| Sleep score | Sleep duration, stages, bed and wake times | 50% duration vs target, 20% regularity, 20% time awake, 10% deep + REM share | 0–100, plus 7-day sleep debt in hours |
| Strain | Heart-rate zones, workout effort | Zone-weighted minutes (zone 1 = 1 point … zone 5 = 5 points); lifting without HR uses effort (1–10) × minutes | Daily load, plus last 7 days vs last 28 days |
| Calories out | Active + resting energy | From Apple Health; resting energy falls back to the Mifflin–St Jeor formula | kcal per day |
| Calories in | Confirmed food entries | Sum of entries | kcal per day, vs target |
| Energy balance | In and out | In − out, daily and 7-day average | kcal surplus or deficit |
| Weight trend | Weigh-ins | Exponential moving average, 10% weight to each new day | Trend line and weekly rate |
| Real TDEE | Intake and weight trend over 21 days | Energy balance solved from actual weight change | kcal per day, with confidence |
| Illness warning | HRV, resting HR, optional breathing rate | Resting HR ≥ 2 SD above baseline and HRV ≥ 1.5 SD below, same morning | Amber card: "illness or overreaching?" |
| Protein and macros | Food entries, body weight | Protein target 1.6 g per kg (adjustable); fat ≥ 25% of calories; carbs fill the rest | Progress bars |
| Steps | Apple Health | Merged daily total | Count vs 8,000 default target |
| Strength log | Sets, reps, kg, effort | Weekly volume per muscle group; estimated 1-rep max (Epley) | Lift history, personal records |
| Mood and energy | Morning check-in, 1–5 each | Stored daily; 10% weight in recovery | Trend and correlations |

**Recovery formula** — each z-score compares today with the last 30 days (HRV on a log scale; resting HR is inverted so lower is better):

```
Recovery = clamp₀¹⁰⁰( 50 + 15 × (0.45·z_HRV + 0.25·z_RHR + 0.20·z_sleep + 0.10·z_mood) )
```

If an input is missing, its weight is shared out among the others. If HRV is missing, the score shows with a "partial" badge.

**Real TDEE** — shown once 14 of the last 21 days are logged; 7,700 kcal is roughly one kg of body tissue:

```
TDEE = mean intake over 21 days − 7700 × Δ trend weight (kg) ÷ 21
```

Until then it blends with the wearable's estimate, leaning more on the real figure as logged days increase.

**Resting energy fallback** (Mifflin–St Jeor), where s = +5 for men and −161 for women:

```
BMR = 10 × kg + 6.25 × cm − 5 × age + s
```

**Estimated 1-rep max** (Epley): weight × (1 + reps ÷ 30).

The illness warning is a nudge, not a diagnosis. It also fires on two mornings in a row of either signal alone.

## Screens and UX

The app opens on one dark Today screen that answers "how am I doing?" in under five seconds. Five tabs sit along the bottom: Today, Food, Train, Trends and Chat. Settings sits behind the profile icon.

| Screen | What's on it | Main actions |
| --- | --- | --- |
| Today | Recovery dial; calories in vs out ring; protein bar; sleep score and debt; strain; steps; AI morning note | Morning check-in; quick-log food; start workout |
| Food | Today's meals with kcal and macros; calories remaining; saved meals | Photo, barcode, search, quick-add, copy yesterday |
| Train | Today's or the last workout; templates; weekly volume per muscle; records | Start from template; log sets; finish with effort rating |
| Trends | Weight trend and weekly rate; real TDEE; energy balance; HRV and resting HR vs baseline; sleep regularity | Switch range: 7 days, 30 days, 90 days, 1 year |
| Chat | Conversation with your data | Ask questions; tap suggested prompts |
| Settings | Targets; units; data sources; AI key and monthly cap; export; delete | Edit targets; re-run Health permissions |

**Look and feel**

- Near-black background, white numbers, grey labels. Big numbers first, explanation one tap away.
- One colour per meaning across the whole app: green, amber and red for recovery only; blue for sleep; orange for strain; teal for food.
- Every score has a "why" sheet listing its inputs, so nothing is a black box.
- Charts use thin lines with a shaded band for your normal range.
- Logging any food or set takes three taps or fewer.

**Home screen widget** (WidgetKit, via [@bacons/apple-targets](https://github.com/EvanBacon/expo-apple-targets))

- Small: recovery score in its colour, plus last night's sleep.
- Medium: recovery, calories left today, protein left today.
- The app writes the numbers into a shared App Group store after each sync; the widget only reads them.

**Morning recovery notification**

- Free accounts can't receive remote push notifications, so the phone itself sends this one.
- Preferred design: a Shortcuts automation triggered when you stop your alarm runs a small app action. That action reads last night's data, computes recovery and posts the notification.
- Fallback if that can't run in the background: a scheduled local notification at your wake time that says "Recovery ready". It updates the moment you open the app.

Whether App Groups and the Shortcuts app action survive free-account signing is checked in Step 0.

## Food logging

Photo logging is the headline, but calories in must work at £0, so every entry method except photos is free. The AI only ever proposes an entry; you confirm it before it counts.

**Photo → AI estimate (optional, paid per use)**

1. Tap the camera, take the photo, optionally add a note ("large portion", "cooked in butter").
2. The app shrinks the photo to about 1,024 px and uploads it to a private storage bucket.
3. A Supabase Edge Function sends it to the Claude API with a fixed prompt. The reply must match a JSON schema: a list of items, each with grams, kcal, protein, carbs, fat and a confidence level.
4. The app shows each item with a portion slider. You adjust, delete or add items, then save.
5. Your corrections are stored. The next estimate includes your usual portions for similar foods, so it improves over time.

**Free methods**

- **Barcode scan** using [Open Food Facts](https://forum.openfoodfacts.org/t/conditions-to-use-the-open-food-facts-api/443). It needs no API key, but every call must send a custom User-Agent naming the app, and rate limits apply per endpoint. Results are cached by barcode on the phone.
- **Search** the same database by name.
- **Quick add**: type kcal and macros directly.
- **Saved meals and recent foods**: one tap to repeat a regular breakfast.
- **Copy yesterday** for days that repeat.

Open Food Facts data is under the Open Database License, so the app credits it on the Food screen.

**Cost controls for AI**

- AI stays off until you add an API key, which is stored only as a Supabase secret, never in the app or repo.
- The Edge Function counts every request and its estimated cost in an `ai_usage` table. It refuses new requests once the monthly cap you set is reached, and the app falls back to search.
- AI features check your user ID, so a friend's copy can never spend your key.
- Photos are deleted 30 days after the meal is saved; the confirmed numbers stay.

## Backend and data model

One free Supabase project holds accounts, daily summaries, food, workouts and AI usage. The phone keeps a local SQLite copy (expo-sqlite), so the app works offline and syncs when it can. Sign-in is an emailed one-time code, which avoids Sign in with Apple and its possible paid-account requirement.

| Table | One row per | Key columns |
| --- | --- | --- |
| `profiles` | User | display name, sex, birth year, height cm, units, targets (JSON), AI enabled, AI monthly cap |
| `daily_metrics` | User per day | HRV, resting HR, sleep minutes, sleep score, steps, active kcal, resting kcal, strain, recovery, weight kg, weight trend, intake kcal, protein / carbs / fat g, mood, energy, soreness |
| `food_entries` | Logged item | eaten at, meal, source (photo / barcode / search / quick), name, grams, kcal, macros, photo path, AI confidence |
| `saved_foods` | Saved food or meal | name, barcode, per-100 g macros, usual portion |
| `exercises` | Exercise | name, muscle group (shared list plus your own) |
| `workouts` | Session | started at, minutes, type, effort 1–10, notes |
| `workout_sets` | Set | workout, exercise, set number, reps, kg, effort |
| `ai_usage` | User per month | requests, input tokens, output tokens, estimated cost |
| `ai_messages` | Chat message | role, content, created at |
| `friendships`, `challenges` | Later (Friends section) | invite code, status, challenge rules, dates |

**Security rules**

- Row Level Security on every table: a row is visible only when its `user_id` matches the signed-in user.
- Leaderboards read from a separate view that exposes only metrics a user has opted in to share.
- The food-photo bucket is private; the app uses short-lived signed links.

**Edge Functions**

- `estimate-food` — photo → Claude → JSON estimate.
- `daily-summary` — writes the morning AI note from the last 7 days of `daily_metrics`.
- `chat` — answers questions, using tools that query your own tables only.
- `keepalive` — a daily scheduled request so the project never hits the one-week inactivity pause, even on holiday.

All three AI functions check your user ID and the monthly cap before calling Claude.

## Build, install and update pipeline

Most changes reach your phone over the air in minutes with no reinstall. Only native changes need a new build, which a free cloud Mac makes and Sideloadly installs. Expo's own build service can't be used: its iPhone builds need a paid Apple account, and the only free route is building on a Mac ([Expo docs](https://docs.expo.dev/develop/development-builds/create-a-build)).

**Set up once** — see `docs/SETUP.md` for the click-by-click version.

1. Create the GitHub repo and add the workflows.
2. Sign in to a free Expo account so the app can receive EAS Update releases.
3. Install Sideloadly (plus the iTunes and iCloud drivers it asks for) on your Windows PC.
4. Run the `iOS build (unsigned)` workflow. On a GitHub macOS runner it runs `expo prebuild`, then builds with code signing switched off, and uploads an unsigned `.ipa`.
5. Download the `.ipa`; Sideloadly signs it with your free Apple ID and installs it over USB.
6. On the iPhone, trust your developer profile in Settings → General → VPN & Device Management ([Corellium](https://support.corellium.com/features/apps/sideloadly)), and turn on Developer Mode if iOS asks.

**Everyday changes (JavaScript, screens, maths)**

1. Claude Code makes the change on a branch; tests run on a cheap Linux runner.
2. You merge to `main`.
3. The `OTA update` workflow runs `eas update --channel production`.
4. The app downloads the update on its next launch and applies it on the one after.

While developing, a development build loads code live from your PC over Wi-Fi, so you see changes instantly without any update step.

**Native changes (new Health type, widget, new native library)**

- The app uses Expo's fingerprint runtime version. An over-the-air update only installs on builds with matching native code, so a mismatched update can never crash the app.
- Both workflows write the native fingerprint to their run summary, and the Step 0 screen shows the one on your phone; when they differ, a new native build is needed.
- Then re-run `iOS build (unsigned)` and reinstall with Sideloadly. Your data is safe: it lives in Apple Health and Supabase, not in the app.

**Weekly refresh**

- Free signing lasts 7 days. Sideloadly's background service can re-sign the app automatically while your PC is on and the iPhone is reachable over USB or Wi-Fi ([Sideloadly overview](https://hamradio.my/sideloadly-the-ultimate-ios-sideloading-tool-without-jailbreak/)).
- The app shows a banner from day 5 if it hasn't been re-signed, as a backup reminder.
- If it lapses, the app won't open until it's re-signed. Nothing is lost.

## Working with Claude Code

One monorepo holds the phone app, shared maths and backend (the web dashboard arrives in Phase 3). `CLAUDE.md` at the root tells Claude Code how the project works, so every session starts with the same rules.

**Learning as you go**

- Ask Claude Code to explain each change before making it, then summarise what it did in `docs/learning-log.md`.
- Big choices get a one-page note in `docs/decisions/`, saying what was chosen and why.
- Claude Code marks small, well-scoped jobs as "yours": a new card on Today, a colour change, a new test for a formula. You make them and Claude Code reviews them.
- Start each phase by having Claude Code walk you through the part of the codebase it will touch.

## Friends and leaderboards

The backend is built for friends from day one, but sharing the app itself stays on hold until it's worth paying Apple. The free path only works for friends who can sideload for themselves.

| Route | Cost | What a friend does | Catch |
| --- | --- | --- | --- |
| Friend sideloads it themselves | £0 | Installs Sideloadly, signs your unsigned `.ipa` with their own Apple ID, re-signs every 7 days | They need a computer; HealthKit and App Groups tie an App ID to one team, so their copy needs its own bundle ID ([Apple forums](https://developer.apple.com/forums/thread/834802)) |
| TestFlight | $99 a year + about £20 VAT ([Magora](https://magora-systems.com/apple-developer-fee/)) | Taps an invite link, installs from TestFlight | First external build needs Apple's beta review; builds last 90 days |

Whichever route is used, over-the-air updates reach every copy, well inside Expo's free 1,000 monthly users.

**Leaderboards and challenges**

- Shared metrics: weekly steps, workouts completed, training-day streaks and food-logging streaks.
- Never shared: weight, calories, HRV, sleep or anything health-specific.
- Every metric is opt-in per person and can be switched off at any time.
- Challenges have a rule, a start and end date, and a goal, such as "4 gym sessions a week for 4 weeks".
- Friends join with a 6-character invite code; there's no public search.
- AI features stay yours only; friends' copies hide them.

## Privacy and security

Health data stays in three places you control: Apple Health on your phone, the app's local copy, and your own Supabase project. It goes anywhere else only when you use an AI feature.

- **No tracking.** No analytics, ads or third-party SDKs that phone home.
- **Least access.** The app asks Apple Health only for the types listed in Data sources, and explains each one on first launch.
- **Locked rows.** Row Level Security on every table; the database rejects any read of another user's rows.
- **Secrets out of the repo.** The Claude API key and Supabase service key live only in Supabase and GitHub secrets. GitHub's secret scanning is switched on.
- **AI is explicit.** A photo or summary request sends only what that request needs: one photo, or the last 7 days of daily summaries. It never sends raw heart-rate samples.
- **Your data, portable.** Settings can export everything as CSV and JSON, and delete your account and all rows.
- **Friends' data.** If friends join, you hold their health-adjacent data. Leaderboards store only what they opt in to, and deleting their account removes it.
- **Not medical advice.** Scores are trends against your own baseline. The illness card suggests rest, not a diagnosis.

## Roadmap

Step 0 decides whether the whole plan stays free, so it comes before any real feature. Version 1 then delivers calories in and out. Phases have no dates; each ends when its features work on your phone for a full week.

| Stage | Contents | Gate after it |
| --- | --- | --- |
| Step 0 · Free-path test | Unsigned build, sideload + trust, read Helio data, OTA update, widget test, alarm action test | Health data + OTA update work on a free build; if not, pay $99 |
| Phase 1 · Calories | Food photo + AI, barcode and search, calories out, weight trend, protein and macros, Today screen | — |
| Phase 2 · Recovery | Baselines, sleep score, recovery dial, mood check-in, widget and alert, illness warning | — |
| Phase 3 · Training, AI | Strength log, strain 7 vs 28 days, real TDEE, AI summary and chat, laptop dashboard | Friends want in → pay $99 for TestFlight |
| Phase 4 · Friends | Invite codes, leaderboards, challenges, TestFlight | — |

**Step 0 checklist**

- [ ] GitHub Actions builds an unsigned `.ipa` on a macOS runner
- [ ] Sideloadly installs it with your free Apple ID, and it opens after you trust the profile
- [ ] It reads steps, HRV, resting HR and sleep from Apple Health
- [ ] Note which types Zepp writes, and how soon after waking they appear
- [ ] An `eas update` publishes a text change that appears without reinstalling
- [ ] A test widget shows a number written by the app through an App Group
- [ ] A Shortcuts "alarm stopped" automation runs an app action and posts a notification
- [ ] Sideloadly's auto-refresh re-signs the app after 7 days

If the first three pass, the free path holds. The widget and alarm tests only decide whether those two features ship or use their fallbacks.

## Risks and open questions

The biggest risk is that free-account signing drops a capability the app relies on. Step 0 tests exactly that before any real feature is built.

| Risk | Effect | Mitigation or fallback |
| --- | --- | --- |
| Sideloadly's re-signing drops the HealthKit entitlement | App can't read Apple Health | Step 0 test; if it fails, pay for the Apple Developer Program |
| App Groups don't survive free signing | Widget shows nothing | Ship without the widget; notification and app still work |
| The Shortcuts app action won't run in the background | No computed score in the morning notification | Scheduled "Recovery ready" notification instead |
| Zepp doesn't write HRV, sleep stages or resting energy, or writes them late | Recovery and calories-out less precise | Recovery runs on resting HR and sleep with a "partial" badge; resting energy calculated |
| Weekly re-sign is missed | App won't open until re-signed | Sideloadly auto-refresh; in-app banner from day 5 |
| Supabase pauses after a quiet week | Sync fails until restored | Daily `keepalive` request |
| AI estimates are off | Calorie totals drift | Confirm step, portion sliders, learned portions, free methods |
| Apple changes free-provisioning rules | Free path stops working | Data is safe; switch to TestFlight |

**Decisions still to make**

- [x] App name: Baseline
- [x] Public GitHub repo
- [x] Bundle ID: io.github.will123sykv.baseline
- [ ] Units: kg or stone, cm or feet
- [ ] How you'll weigh in: typed in the app, or a smart scale that writes to Apple Health
- [ ] Nightly sleep target (default 8 hours) and usual wake time
- [ ] Profile details for resting-energy maths: sex, height, birth year
- [ ] Monthly AI spending cap, if AI is switched on

## Sources

- [Corellium – Sideloadly with a free Apple account](https://support.corellium.com/features/apps/sideloadly)
- [Sideloadly overview (auto-refresh, 3-app limit)](https://hamradio.my/sideloadly-the-ultimate-ios-sideloading-tool-without-jailbreak/)
- [Expo docs – Create a development build](https://docs.expo.dev/develop/development-builds/create-a-build)
- [Expo – EAS pricing](https://expo.dev/pricing.md)
- [CICDCost – GitHub Actions pricing 2026](https://cicdcost.com/github-actions-pricing)
- [Automation Atlas – Supabase free tier limits 2026](https://automationatlas.io/answers/supabase-free-tier-limits-2026/)
- [Open Food Facts forum – API conditions](https://forum.openfoodfacts.org/t/conditions-to-use-the-open-food-facts-api/443)
- [@kingstinct/react-native-healthkit on npm](https://www.npmjs.com/package/%40kingstinct%2Freact-native-healthkit)
- [Expo Apple Targets on GitHub](https://github.com/EvanBacon/expo-apple-targets)
- [Apple Developer Forums – App Groups and HealthKit on personal teams](https://developer.apple.com/forums/thread/834802)
- [Magora – Apple Developer fee 2026](https://magora-systems.com/apple-developer-fee/)
- [Notebookcheck – Helio Strap HRV sync to Apple Health](https://www.notebookcheck.net/Amazfit-brings-new-HRV-data-sharing-feature-to-wearable.1149080.0.html)
