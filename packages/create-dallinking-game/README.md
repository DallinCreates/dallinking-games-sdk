# @dallincreates/create-dallinking-game

Zero-dependency CLI that scaffolds a new single-player game project for [games.dallinking.com](https://games.dallinking.com), pre-wired with `@dallincreates/game-client`.

## Usage

```bash
npx create-dallinking-game my-game
cd my-game
npm install
npm run dev
```

## What it generates

A single-page Vite + React app (matching the same `index.html`-entry, `base: './'` convention already used by every game.dallinking.com project) with:

- `public/game.config.json` — the game's discoverability metadata (title, descriptions, tags, difficulty, duration, thumbnail/cover assets).
- `src/App.jsx` — a working example wiring `updateProgress`/`gameReady`, `getSaveData`/`saveData`, `getUser`/`getLanguage`, and `onPauseRequest`/`onMuteRequest`/`onUnmuteRequest`/`onFocusLost`.
- `src/ErrorBoundary.jsx` — reports uncaught render errors via `DallinSdk.fatalError()`.
- `scripts/build-zip.js` — zips `dist/` into `<game-id>.zip` (name derived from `game.config.json`, not hardcoded) after `npm run build`.
- A generated `README.md` documenting the full `DallinSdk` API for the new project.

## Building

```bash
npm run build:all
```

Runs `vite build` then `scripts/build-zip.js`, producing a `.zip` ready to upload to the games.dallinking.com developer dashboard.
