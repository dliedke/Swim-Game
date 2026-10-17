# Aqua Sprint 3D

## Git workflow
- Always commit and push straight to `main` (merge into `main` directly). Do not leave work on a feature branch or open a pull request unless the owner asks for one.
- The game is served by GitHub Pages from `main`: https://dliedke.github.io/Swim-Game/

## Project notes
- Plain HTML + CSS + JavaScript with Three.js in `lib/`; no build step. Open `index.html` to run.
- All player-facing text lives in `js/i18n.js` (English and Portuguese). Add new strings there in both languages and use `SG.t('key')` in code or `data-i18n="key"` in `index.html`.
