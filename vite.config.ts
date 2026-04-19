import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// ITCH_BUILD=1 strips the PWA service worker. itch.io iframes games in a
// sandbox where SW registration either fails silently or caches stale assets
// across itch's own version-bumped iframe URLs. Leaving SW off for itch
// prevents "I'm seeing an old version" reports after a push.
const isItchBuild = process.env.ITCH_BUILD === '1';

export default defineConfig({
  base: './',
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  plugins: [
    ...(isItchBuild ? [] : [
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'NETRUNNER // Intrusion Defense',
          short_name: 'NETRUNNER',
          description: 'Cyberpunk roguelike tower defense.',
          theme_color: '#00fff0',
          background_color: '#05060a',
          display: 'fullscreen',
          // `any` allows the installed PWA to honor whichever orientation the
          // user is currently holding the device in, matching the new responsive
          // landscape/portrait CSS.
          orientation: 'any',
          start_url: './',
          icons: [
            { src: 'icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
            { src: 'icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          // Take control of all open tabs the moment a new SW activates, so a deploy
          // rolls out on the player's next page load instead of whenever all tabs close.
          skipWaiting: true,
          clientsClaim: true,
          // Delete precache entries from previous builds so the cache doesn't grow forever.
          cleanupOutdatedCaches: true,
        },
      }),
    ]),
  ],
  server: { host: true, port: 5173 },
  build: {
    target: 'es2022',
    // Sourcemaps bloat the itch zip by ~2x. They're useful for web debugging
    // but nobody needs them in a sold-to-customer build.
    sourcemap: !isItchBuild,
  },
});
