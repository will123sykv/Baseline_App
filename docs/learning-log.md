# Learning log

Newest first. A few lines per piece of work: what changed, and one idea worth understanding.

## 2026-10-22 · Project set up

**What changed:** Created the monorepo, the maths package with 60 tests, the app skeleton (Today, four placeholder tabs, Step 0 check), the database schema and the GitHub workflows.

**Worth understanding:**

- **Why a separate `packages/core`?** The maths has no screens, no network and no Apple Health in it, just numbers in and numbers out. That makes it easy to test on Windows in a second (`npm test`), and the phone, web dashboard and AI can all import it, so they never disagree about your recovery score.
- **Why a fake Health service?** HealthKit only exists on a real iPhone. The fake returns believable sample data, so you can build and look at screens in your browser with `npm run web`.
- **Native vs JavaScript.** Your app is two layers: native code (compiled by Xcode, installed with Sideloadly) and JavaScript (screens and logic). JavaScript can be swapped over the air in a minute. Native code needs a new build. The "fingerprint" is a hash of everything native, so the app only accepts updates built for the same native layer.
- **Row Level Security.** The database checks every query against the signed-in user, so even a bug in the app can't show someone else's rows.
