# NETRUNNER — iOS Setup (Mac handoff)

This doc is for setting up the iOS native build on a Mac and getting the game
running on an iPhone. The Windows-side setup (Capacitor config, plugins, npm
scripts) is already done — this is the Mac-only portion.

## Prerequisites (one-time)

1. **Xcode** (free, Mac App Store). Install + accept the Xcode license by
   running `sudo xcodebuild -license` once.
2. **CocoaPods**: `sudo gem install cocoapods` (or `brew install cocoapods`).
3. **Apple ID** — not a paid Developer account yet. A free Apple ID can sign
   and sideload to your own iPhone for 7 days at a time, which is enough for
   dev/testing. You only need the **$99/year Apple Developer Program** when
   you submit to the App Store.
4. **Node 18+** installed on the Mac (`brew install node`).

## First-time project setup (on the Mac)

```bash
# 1. Clone / pull the latest repo on the Mac
git clone https://github.com/SundayKoi/towerDefense.git
cd towerDefense

# 2. Install dependencies
npm install

# 3. Build the web bundle (produces dist/)
npm run build

# 4. Add the iOS platform — generates ios/App/App.xcodeproj
npx cap add ios

# 5. Sync Capacitor → iOS and install the CocoaPods deps
npx cap sync ios

# 6. Open Xcode
npx cap open ios
```

After that, the `ios/` folder exists. You can commit it or leave it gitignored
(see `.gitignore`) — it's regeneratable either way.

## Deploying to your iPhone (first time)

1. Plug your iPhone into the Mac with a Lightning/USB-C cable.
2. In Xcode, top-left: select your iPhone from the device dropdown
   (it shows up once the Mac trusts the device — you may get a "Trust this
   computer?" prompt on the phone).
3. Click the **App** target in the Xcode sidebar, go to **Signing &
   Capabilities**:
   - **Team**: pick your Apple ID (sign in via Xcode → Settings → Accounts
     if not there).
   - **Bundle Identifier**: matches `capacitor.config.ts` (`com.netrunner.td`).
     If that ID is taken on Apple's side, change both config values to
     something unique like `com.yourname.netrunner`.
4. Hit the **▶ Run** button (Cmd+R).
5. First run: Xcode will complain that the app's developer isn't trusted on
   your phone. On the iPhone:
   `Settings → General → VPN & Device Management → trust your Apple ID.`
6. Re-run. The game launches in landscape on your phone.

## Iterating (after first setup)

After any web code change on Windows (or the Mac):

```bash
# Rebuild the web bundle + push changes to the iOS project
npm run ios:sync

# Then in Xcode, Cmd+R runs the updated build on the phone
```

For even faster iteration during active dev you can serve the Vite dev
server over the LAN and point Capacitor at it (live-reload). Add to
`capacitor.config.ts` when actively developing (remove before building
for release):

```ts
server: {
  url: 'http://<your-mac-lan-ip>:5173',
  cleartext: true,
},
```

Then `npm run dev` on the Mac and the iPhone loads the live server, same as
the browser. Orientation + haptics still use the native wrapper.

## Things to tune before App Store submission

- **App icon**: Xcode → `App/Assets.xcassets/AppIcon.appiconset/` — replace
  with a proper 1024×1024 PNG. `xcassets` auto-generates the rest.
- **Launch screen**: `App/Base.lproj/LaunchScreen.storyboard` — default
  is white; swap to a branded splash.
- **Display name**: `App/Info.plist` → `CFBundleDisplayName`. Right now it
  reads `NETRUNNER` from `capacitor.config.ts`; change for a cleaner name
  on the home screen.
- **Orientation lock** (landscape): already set in
  `ios/App/App/Info.plist` → `UISupportedInterfaceOrientations` (Capacitor
  should write it; double-check).
- **Safe area**: the HUD and tokens bar will clip on notched iPhones unless
  the CSS respects `env(safe-area-inset-*)`. We already do in `main.css` —
  test both "notch-left" and "notch-right" landscape orientations on your
  phone.
- **Privacy info**: Apple requires a privacy nutrition label. Since the game
  doesn't collect or transmit anything, this is a quick "None / No data
  collected" checklist in App Store Connect.

## Common first-day issues

- **"Code signing error: no team selected"** → Xcode Signing tab, pick
  your Apple ID.
- **App crashes on launch, black screen** → most likely the Capacitor sync
  didn't copy `dist/`. Re-run `npx cap sync ios`.
- **Landscape locked but launches portrait briefly** → normal on first
  launch, iOS rotates after the view loads. If it stays portrait, check
  `Info.plist UISupportedInterfaceOrientations`.
- **Haptics feel wrong / don't fire** → `@capacitor/haptics` is installed;
  open Settings → Sounds & Haptics on the phone and make sure "System
  Haptics" is on.

## What we haven't done yet

- **Android** — same flow, different directory (`npx cap add android`,
  Android Studio instead of Xcode). Install Android Studio on the Mac if
  you want to build for both.
- **Cloud saves** — needs Game Center (Apple) or Firebase integration.
  At paid-price with player progression, recommended to add before launch.
- **Splash screen plugin** — `@capacitor/splash-screen` for controllable
  fade-in timing. Current setup uses the native launch storyboard.
- **Low-perf graphics preset** — add `save.settings.particleQuality = 'low'`
  auto-default on budget devices before shipping.
