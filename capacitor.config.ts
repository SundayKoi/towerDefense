import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor configuration for the native iOS / Android wrappers.
// The web build remains the source of truth — Capacitor consumes the
// Vite output in `dist/`, so desktop web dev is unaffected.
//
// Change appId BEFORE submitting to the App Store — this is the bundle
// identifier Apple uses to uniquely identify the app forever. Format is
// reverse-DNS. `com.netrunner.td` works but if you have a domain or
// personal namespace, use that (e.g. `com.sundaykoi.netrunner`).
const config: CapacitorConfig = {
  appId: 'com.netrunner.td',
  appName: 'NETRUNNER',
  webDir: 'dist',
  // Lock orientation to landscape. The game's CSS already assumes landscape;
  // portrait would require a full layout rework.
  ios: {
    scheme: 'NETRUNNER',
    // Don't let the status bar overlap the game canvas — the HUD lives up top.
    contentInset: 'always',
    // iOS-specific tuning. The webView background stays black so there's no
    // flash-of-white during navigation on OLED iPhones.
    backgroundColor: '#05060a',
    // Auto-handle keyboard insets (not used by the game but stops unexpected
    // layout shifts if a native input ever gets focus).
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#05060a',
  },
  // Splash screen + safe-area handling configured via plugins if we install
  // @capacitor/splash-screen later. For v1 we use the native launch storyboard
  // on iOS and the default resource on Android.
};

export default config;
