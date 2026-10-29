# Tutorial video

A scripted tour recreated from the site's own styles, button data and pictures. No real account is used.

To re-render after changing the site:
1. Copy into this folder: `app/globals.css`, `public/flummox.webp`, `public/starport-logo.png`, `public/tiles/`, and the Baloo 2 font as `Baloo2.ttf` (from github.com/google/fonts, `ofl/baloo2`).
2. Dump the buttons: transpile `lib/options.ts` and write `{GROUPS, KINDS}` to `groups.json`.
3. `(printf 'const DATA = '; cat groups.json; printf ';\n'; cat tour-src.js) > tour.js`
4. Check frames: `node frames.js check 5 30 60`. Render: `node render.js Dream-Factory-Tour.mp4` (needs Playwright and ffmpeg).

The timeline (captions, cursor moves, clicks) is the "the tour" section of `tour-src.js`.
