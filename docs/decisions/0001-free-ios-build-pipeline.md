# 0001 · Free iOS build pipeline

**Date:** 2026-10-22 · **Status:** Accepted, to be proven by Step 0

## Decision

Build an unsigned `.ipa` on a GitHub-hosted `macos-26` runner (public repo, so minutes are free), ad-hoc sign it with the app's entitlements, and install it from Windows with Sideloadly using a free Apple ID. Ship JavaScript changes with EAS Update on the free plan, gated by the fingerprint runtime version.

## Why

- EAS Build can't produce an iPhone build without a paid Apple account, and Windows can't run Xcode.
- A free Apple ID can sign apps for your own device for 7 days; Sideloadly automates the signing and can refresh it.
- An unsigned build carries no entitlements. Ad-hoc signing (`codesign -s -`) with `Baseline.entitlements` embeds them, so the re-signer can request a matching profile (HealthKit).
- Fingerprint runtime versions stop an over-the-air update reaching a build whose native code doesn't match.

## What would change this

- HealthKit unavailable after sideloading → try Sideloadly's options for keeping entitlements; failing that, pay for the Apple Developer Program and switch to EAS Build + TestFlight.
- Friends wanting the app → TestFlight (paid).
