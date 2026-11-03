# Kiwi Guide privacy policy: say how we use email

Work in `C:\Users\User\source\blacksands`. The page is `public/kiwi-guide.html`, served at https://blacksands.app/kiwi-guide#privacy (Firebase Hosting, project `blacksands-a37aa`).

## Why

The app is about to be submitted. The policy says we collect an email address but never says what for, so we can't email users for feedback or news. This adds the promise; the opt-in box in the app comes after launch.

## The change

1. In the Privacy Policy (`<h2 id="privacy">`), section **2. How We Use Your Information**, add a new paragraph after the existing one ("Your data is used solely to provide…"). Use this text exactly:

   > We email you about your account. We'll only send feedback requests or news if you've agreed to it, and every email lets you stop.

   Same markup as the paragraph above it: a plain `<p>`.
2. Set "Last Updated" to today's date. The date is `formattedDate` in the `x-data` on the legal box (around line 69, currently `'13 October 2026'`), in the same format. The Terms and the Privacy Policy share it, which is fine.

## Leave alone

- Every other page. `rotorua-guide.html`, `guide-akl.html` and `volcanic-akl.html` have the same wording, but they're other apps.
- `.claude/worktrees/`.
- The untracked `south-island-blog.zip`.
- The rest of the policy text.

## Check, commit, deploy

1. Run `git diff` and check it shows only the new paragraph and the date.
2. Commit on `main`: `docs(kiwi-guide): privacy policy says how we use email`.
3. **Ask the owner before pushing or deploying.** Once they say go:
   1. Run `git push`.
   2. Run `firebase deploy --only hosting`.
   3. Open https://blacksands.app/kiwi-guide#privacy and confirm the new line and date are live. The page may be cached, so hard-refresh.
