# Changelog

## 2026-11-12: repo-wide audit

- **Cloud progress:** if the read at sign-in fails, the next save no longer overwrites the trainee's cloud copy. It reads the cloud copy again and merges it, or waits and retries.
- **Certificates:** a trainee can save only their own new certificate. A certificate already issued can't be overwritten, and a trainee can't make one in someone else's name.
- **Size limits:** trainee feedback and certificates are capped at 20 KB, the progress snapshot at 4 MB, and a trainee record at 200 KB.
- **Lost updates:** a Monitoring Sheet item grade and an assessment grade each write back only their own entry. A save made at the same time is no longer lost.
- New test `.github/scripts/storage-guards.cjs` runs in CI.
- Dead code removed (about 40 lines): unused card templates (ftCalCheckCard, ftCalRulesCard, ftDrillsCard, ftGuideCard, ftListenSection), ftShadowItems, the Batch Sheet's updBtn/SYNC_OF and the checkSurpriseTask stub.

## 2026-11-11: debug round 2 (PR #682)

- The Worker's day compliance no longer overwrites a save made at the same time.
- A Monitoring Sheet entry counts as missing only once the training is done.
- EOD Inbox: trainees are read once each time it opens, and a match on the first name only doesn't keep the sender's address.
- Tracker and EOD rules: four reading fixes.
- Batch Sheet: Send Feedback works inline, the Weekly Report rows are fixed, and the points pop-up shows.
