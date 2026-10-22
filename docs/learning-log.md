# Learning log

Newest first. A few lines per piece of work: what changed, and one idea worth understanding.

## 2026-10-22 · Food tab: quick add, saved foods, copy yesterday

**What changed:** The Food tab is a real screen. Calories remaining with
protein, carb and fat bars; meals grouped into breakfast, lunch, dinner and
snacks; quick add; saving a food to reuse; one-tap repeat portions; and copy
yesterday. `packages/core/src/food.ts` holds the maths, with 12 tests — the
suite is now 85.

Open Food Facts search and barcode scanning are still to come, so there is no
credit line on the screen yet; it goes on when their data first appears.

**Worth understanding:**

- **The screen never does arithmetic.** `food.tsx` renders what
  `macroProgress()` returns. That's why "what's left" could be tested without
  a phone, a browser or a screen at all — and why the web dashboard will later
  show the same numbers without the logic being written twice.
- **A bug worth recognising again.** Tapping a saved food opened a screen with
  the Add button permanently greyed out. The saved foods arrive from the save
  file a moment *after* the screen first draws, and `useState` only takes its
  starting value on that first draw — so the name stayed empty, and the button
  checked for a name. Same shape as the Settings screen needing a `useEffect`.
  Any time a screen seems to ignore saved data, ask whether it read it before
  it had arrived.
- **Pick the control the app can already draw.** Swipe-to-delete needs
  `react-native-gesture-handler`, a native library — so it would mean a new
  iOS build and a reinstall. A plain × does the same job over the air.
- **Mixed units are a real trap.** The weight card briefly showed the trend in
  stone and the weekly rate in kg. Stone is also silly for a change of 0.14 kg,
  so the rate shows pounds on its own.

## 2026-10-22 · Settings, profile and weigh-ins

**What changed:** Added a Settings screen (sex, height, birth year, units,
daily targets), a local save file to keep it in, a "Log weight" screen that
writes to Apple Health, and wired both into Today. `packages/core` gained
`profile.ts` with 13 new tests, so the suite is now 73.

The point of it: the Calories out card was dead. `summarizeToday` was being
called with no options, so no body profile reached `caloriesOut()`, and with
no strap writing resting energy to Apple Health it had nothing to add up.
Fill in the profile now and resting energy is estimated instead.

**Worth understanding:**

- **Why the Calories out card could never have worked.** `caloriesOut()`
  returns `null` when Apple Health has no resting energy *and* no profile was
  passed. Both were true. The maths was right all along; nothing was feeding
  it. Worth remembering when a number looks broken — check what's being passed
  in before suspecting the formula.
- **Metric is stored, units are only a view.** Heights and weights are always
  kept in centimetres and kilograms; `units` decides how they're shown. Storing
  what the user typed in whatever unit they chose is how data sets end up with
  a column where some rows are kilograms and some are pounds.
- **`useSyncExternalStore`.** Settings are read by Today *and* by the Settings
  screen. A normal `useState` hook would give each screen its own copy, so
  saving in one wouldn't update the other. This keeps one copy outside React
  and lets both screens subscribe to it.
- **The fake had to become more honest.** Its `probe()` reported resting energy
  as absent (what a phone with no strap really looks like) while `getDays()`
  handed some back anyway. That inconsistency hid the exact path this work
  added, so the fake now returns none.

## 2026-10-22 · Project set up

**What changed:** Created the monorepo, the maths package with 60 tests, the app skeleton (Today, four placeholder tabs, Step 0 check), the database schema and the GitHub workflows.

**Worth understanding:**

- **Why a separate `packages/core`?** The maths has no screens, no network and no Apple Health in it, just numbers in and numbers out. That makes it easy to test on Windows in a second (`npm test`), and the phone, web dashboard and AI can all import it, so they never disagree about your recovery score.
- **Why a fake Health service?** HealthKit only exists on a real iPhone. The fake returns believable sample data, so you can build and look at screens in your browser with `npm run web`.
- **Native vs JavaScript.** Your app is two layers: native code (compiled by Xcode, installed with Sideloadly) and JavaScript (screens and logic). JavaScript can be swapped over the air in a minute. Native code needs a new build. The "fingerprint" is a hash of everything native, so the app only accepts updates built for the same native layer.
- **Row Level Security.** The database checks every query against the signed-in user, so even a bug in the app can't show someone else's rows.
