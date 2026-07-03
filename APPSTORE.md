# DecaStory → iOS App Store

The repo now contains a Capacitor iOS wrapper that loads the live app at
https://decastory.vercel.app inside a native shell, with haptics, status-bar
styling, safe-area support, an offline fallback page, and in-app account
deletion (an Apple requirement).

## 0. Deploy the web changes first

The native touches live in the web app, so push to GitHub and let Vercel
deploy before testing the shell:

```bash
git add . && git commit -m "Capacitor iOS shell + account deletion" && git push
```

## 1. One-time setup (your Mac)

1. Install Xcode from the Mac App Store (large download).
2. Install CocoaPods: `brew install cocoapods`
3. Enroll in the Apple Developer Program at https://developer.apple.com/programs ($99/year, takes ~24–48h to approve).

## 2. Generate the iOS project

```bash
npm install
npx cap add ios
npm run ios:sync     # re-run after any change to capacitor.config.ts
npm run ios:open     # opens the project in Xcode
```

## 3. In Xcode

1. Select the **App** target → **Signing & Capabilities** → set your Team
   (appears after developer enrollment). Bundle ID is `com.decastory.app` —
   change it in `capacitor.config.ts` if you prefer something else, then re-run `ios:sync`.
2. Add the app icon: **App → Assets.xcassets → AppIcon** → drop in a
   1024×1024 PNG (no transparency, no rounded corners — Apple rounds it).
3. Pick a simulator (e.g. iPhone 16) and press ▶ to test. Verify: login works,
   choices give haptic taps on a real device, airplane mode shows the offline page.

## 4. App Store Connect

1. https://appstoreconnect.apple.com → **My Apps → + → New App**. Platform iOS,
   name "DecaStory", bundle ID `com.decastory.app`, SKU anything (e.g. `decastory-001`).
2. **Screenshots**: run the app in the largest iPhone simulator, take 3–5
   screenshots (⌘S) of the best screens — story config, a story slide with choices,
   the timeline tree, the vault.
3. **Privacy policy URL**: `https://decastory.vercel.app/privacy`
4. **App Privacy (nutrition labels)**: declare Email Address (account), and
   User Content (stories) — both "linked to identity", not used for tracking.
5. **Age rating**: answer the questionnaire honestly. Because the app offers an
   R maturity setting with AI-generated content, expect a 17+ rating. If you
   want a lower rating, remove the R option from the iOS experience first.
6. **App Review notes** — this matters:
   - Provide a working **demo account** (email + password you create in the app).
     Apple rejects login-gated apps without one.
   - Briefly explain the AI safety controls: fixed maturity ratings enforced in
     prompts, Gemini's safety filters, and per-day generation limits.

## 5. Upload and submit

In Xcode: select **Any iOS Device (arm64)** as the target → **Product →
Archive** → **Distribute App → App Store Connect → Upload**. The build appears
in App Store Connect after ~15 min of processing. Attach it to your app version,
fill in the description, and **Submit for Review**. First reviews typically take 1–3 days.

## Known rejection risks & how they're handled

| Guideline | Risk | Status |
|---|---|---|
| 5.1.1(v) account deletion | Apps with sign-up must offer in-app deletion | ✅ Added — nav menu → "Delete account" → `DELETE /api/account` |
| 2.1 demo account | Login-gated apps need review credentials | ⚠️ You must supply one in review notes |
| 4.2 minimal functionality | Thin web wrappers get rejected | Mitigated: haptics, status-bar theming, safe areas, offline handling. If rejected anyway, the fix is usually adding one more native feature (push notifications for "your story awaits" is the natural one) and replying to the rejection. |
| 1.2 / AI content | AI-generated content needs moderation controls | Maturity ratings + provider safety filters; explain in review notes |

## Ongoing updates

Web changes (UI, story logic) ship instantly via Vercel — no App Store review
needed. Only changes to the native shell (plugins, icon, config) require a new
Xcode archive and review.
