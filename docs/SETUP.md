# Setup on Windows (Step 0)

This gets the first build of Baseline onto your iPhone for £0 and checks the free path works. Allow about an hour the first time, most of it waiting for the build.

You need: your Windows PC, your iPhone and a USB cable, a GitHub account, your Apple ID, and Node.js 22 LTS and Git installed.

## 1 · Get the code running on your PC

1. Clone your repo and install:
   ```
   git clone https://github.com/will123sykv/Baseline_App.git
   cd Baseline_App
   npm install
   ```
2. Check the maths: `npm test` should say **60 passed**.
3. Look at the app in your browser with sample data: `npm run web`, then press `w` if a browser doesn't open. This is the quickest way to see screen changes while you work.

## 2 · Expo account (free) for over-the-air updates

1. Sign up at https://expo.dev (free plan, no card).
2. In a terminal:
   ```
   cd apps/mobile
   npx eas-cli@latest login
   npx eas-cli@latest init
   npx eas-cli@latest update:configure
   ```
   `init` links the app to an Expo project and writes its ID into `app.json`. `update:configure` adds the update URL. Accept the defaults; keep `runtimeVersion` as `fingerprint` if asked.
3. Commit and push those `app.json` changes:
   ```
   git add -A && git commit -m "Link Expo project" && git push
   ```

## 3 · Let GitHub publish updates

1. On expo.dev: your avatar → **Account settings** → **Access tokens** → **Create token**. Copy it.
2. On GitHub: your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Name it `EXPO_TOKEN` and paste the token.

## 4 · Build the app (on GitHub's free Mac)

1. Your repo → **Actions** → **iOS build (unsigned)** → **Run workflow** → variant **release** → **Run workflow**.
2. Wait for the green tick (roughly 20–40 minutes).
3. Open the finished run, scroll to **Artifacts**, download the `.ipa` zip and unzip it. You now have `Baseline-release-xxxxxxx-unsigned.ipa`.

If it fails, copy the red error lines into Claude Code.

## 5 · Install with Sideloadly

1. Download Sideloadly from https://sideloadly.io and install it. Its download page lists the iTunes and iCloud versions it needs; install those (the Microsoft Store versions can cause connection problems).
2. Plug in your iPhone, unlock it and tap **Trust** on the phone.
3. Open Sideloadly. Drag the `.ipa` onto it, type your Apple ID, then click **Start**. Enter the code Apple sends to your phone.
4. On the iPhone:
   - **Settings → Privacy & Security → Developer Mode → On**, then restart when asked.
   - **Settings → General → VPN & Device Management** → tap your Apple ID → **Trust**.
5. In Sideloadly, turn on automatic refresh for the app so it re-signs itself before the 7 days run out. Your PC needs to be on, with the phone plugged in or on the same Wi-Fi, at least once a week.

## 6 · Connect the Helio Strap's data

1. In the Zepp app: **Profile → Add accounts → Health**, then switch on every category.
2. In Apple Health, make Zepp the preferred source for each heart and sleep type: **Browse → Heart → Heart Rate Variability → Data Sources & Access → Edit** and drag Zepp to the top. Repeat for Resting Heart Rate, Heart Rate, Sleep and Steps.
3. Wear the strap for a night so there's something to read.

## 7 · Run the Step 0 check

1. Open **Baseline**. Allow everything on the Apple Health permission sheet.
2. Tap **Open Step 0 check** at the bottom of Today.
3. Tap **Share report** and paste the text into Claude Code with: "Here's my Step 0 report".

What it tells you:

| Section | Pass means |
| --- | --- |
| Install and signing | The free signing works and shows when it expires |
| Apple Health | HealthKit survived sideloading, and you can see which data types Zepp actually writes |
| Over-the-air updates | Updates are switched on for this build |

## 8 · Test an over-the-air update

1. Edit `OTA_MARKER` in `apps/mobile/src/lib/build.ts`, for example to `'Build 1 · first OTA update'`.
2. Commit and push to `main`. The **OTA update** workflow runs by itself (about 3 minutes).
3. On the phone, open Baseline, close it fully (swipe it away), then open it again. The Step 0 screen should show your new text and "Running an over-the-air update". You can also tap **Check for update** then **Restart to apply**.

If all of that works, the free path holds and Phase 1 can start.

## Developing with live reload (optional)

A **development** build loads code straight from your PC, so changes appear on the phone as you save.

1. Run **iOS build (unsigned)** with variant **development** and install it with Sideloadly. It replaces the release build (same app ID).
2. On your PC: `npm run mobile`. Your phone must be on the same Wi-Fi.
3. Open Baseline on the phone and pick your PC's server from the list, or scan the QR code in the terminal with the iPhone camera.

Switch back to a release build when you're done, so over-the-air updates keep working.

## When you need a new build

Only when native code changes: a new library with native code, a new Apple Health type, a widget, or a change to `app.json` plugins. Claude Code will say when. Otherwise every push to `main` reaches your phone as an over-the-air update.
