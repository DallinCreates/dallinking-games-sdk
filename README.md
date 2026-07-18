# dallinking-games-sdk

SDK for building single-player games hosted on [games.dallinking.com](https://games.dallinking.com). Structured the same way as [`dallinking-boardgames-sdk`](https://github.com/dallincreates/dallinking-boardgames-sdk) (npm workspaces monorepo, hand-rolled dual CJS/ESM `tsc` build), but simplified for single-player games: one `index.html` entry point per game instead of a board/player split, and no server/engine package.

## Packages

- [`packages/client`](./packages/client) — `@dallincreates/game-client`, the `DallinSdk` bridge a game imports to talk to the games.dallinking.com portal from inside its iframe.
- [`packages/create-dallinking-game`](./packages/create-dallinking-game) — `create-dallinking-game`, a zero-dependency CLI that scaffolds a new game project.

## Getting started

```bash
npx create-dallinking-game my-game
cd my-game
npm install
npm run dev
```

## The Universal Payload Schema

Every message between a game and the portal — in both directions — uses this envelope:

```json
{
  "dallinSdk": true,
  "type": "ACTION_NAME",
  "payload": { "...": "..." },
  "id": "req_...",
  "gameId": "my-game",
  "instanceId": "..."
}
```

- **`dallinSdk: true`** — signature so the listener can ignore unrelated `postMessage` traffic (extensions, ads, devtools).
- **`type`** — an uppercase action name (see the message table in `packages/client/README.md`).
- **`payload`** — the data for the message, or `null`.
- **`id`** — a unique id per message. When the portal replies to a request, it echoes the same `id` back so the SDK can resolve the matching pending promise, regardless of the reply's `type`.
- **`gameId`** — the requesting game's own id (from its `game.config.json`), included on every message so the portal can log/attribute calls per game.
- **`instanceId`** — assigned by the portal during the registration handshake (see below) and included by the SDK on every message after that. Lets the portal verify a message actually came from the iframe it registered, not a spoofed source.

### Registration handshake

1. On load, the SDK fire-and-forgets `SDK_INIT` with its `gameId` (no `instanceId` yet).
2. The portal checks the `gameId` matches what it expected to load at this route, generates a fresh `instanceId`, and replies `SDK_REGISTERED { instanceId }` — correlated by the `id` of the `SDK_INIT` message, sent directly back to the originating frame via `event.source.postMessage(...)`.
3. The SDK stores `instanceId` and includes it on every subsequent outgoing message.

When a game is not running inside an iframe (`window.self === window.top`, e.g. plain `npm run dev`), the SDK skips this handshake entirely and resolves all calls with local dev-mode fallbacks instead — see `packages/client/README.md`.

## Building

```bash
npm install
npm run build --workspaces
```

Each package's `build` script (`node ../../scripts/build-package.mjs`) compiles its `src/` with `tsc` twice (`--module CommonJS` → `.cjs`, `--module ESNext` → `.mjs`) and copies the hand-written `src/index.d.ts` straight to `dist/index.d.ts`.
