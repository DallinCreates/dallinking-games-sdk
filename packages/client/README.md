# @dallincreates/game-client

The `DallinSdk` bridge a game embedded in [games.dallinking.com](https://games.dallinking.com) imports to talk to the portal. Framework-agnostic — no React dependency, no init call required.

## Usage

```js
import { DallinSdk } from '@dallincreates/game-client';

const save = await DallinSdk.getSaveData();
// ... restore game state from `save` ...

DallinSdk.gameReady();

DallinSdk.onPauseRequest(() => {
  // pause audio / gameplay loop
});
```

## API

| Method                                                            | Sends                                                  | Expects                            | Standalone (`vite dev`, not embedded) fallback         |
| ----------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------- | -------------------------------------------------------- |
| `getSaveData()` → `Promise<string\|null>`                     | `LOAD_REQUEST`                                       | `LOAD_RESPONSE { saveData }`     | reads`localStorage['dallinsdk:dev:save']`              |
| `saveData(data)` → `Promise<void>`                           | `SAVE_REQUEST { saveData }`                          | `SAVE_SUCCESS`                   | writes the same key                                      |
| `getUser()` → `Promise<{isLoggedIn, username, userId}>`      | `USER_REQUEST`                                       | `USER_RESPONSE`                  | `{isLoggedIn:false, username:null, userId:null}`       |
| `getLanguage()` → `Promise<string>`                          | `LANGUAGE_REQUEST`                                   | `LANGUAGE_RESPONSE { language }` | `navigator.language`                                   |
| `showAd()` → `Promise<{watched}>`                            | `AD_REQUEST`                                         | `AD_COMPLETE`                    | resolves`{watched:true}` immediately                   |
| `openLink(url)` → `Promise<{opened}>`                        | `OPEN_LINK_REQUEST { url }`                          | `OPEN_LINK_RESPONSE`             | `window.open(url, '_blank', 'noopener,noreferrer')`    |
| `requestFullscreen()` → `Promise<{granted}>`                 | `FULLSCREEN_REQUEST`                                 | `FULLSCREEN_RESPONSE`            | calls the real Fullscreen API                            |
| `requestTheaterMode()` → `Promise<{granted}>`                | `THEATER_MODE_REQUEST`                               | `THEATER_MODE_RESPONSE`          | `{granted:false}` (no portal chrome to dim standalone) |
| `exportSave()` → `Promise<{exported}>`                       | `EXPORT_SAVE_REQUEST`                                | `EXPORT_SAVE_RESPONSE`           | downloads the dev save as a`.json` file                |
| `triggerShare(shareText)` → `Promise<{shared}>`              | `SHARE_REQUEST { shareText }`                        | `SHARE_RESPONSE`                 | `navigator.share`, else clipboard copy                 |
| `updateProgress(percentage)`                                    | fire-and-forget`PROGRESS_UPDATE { percentComplete }` | —                                 | `console.log`                                          |
| `gameReady()`                                                   | fire-and-forget`GAME_READY`                          | —                                 | `console.log`                                          |
| `fatalError(message)`                                           | fire-and-forget`FATAL_ERROR { message }`             | —                                 | `console.error`                                        |
| `onPauseRequest(cb)` → unsubscribe fn                          | listens for`PAUSE_COMMAND`                           | —                                 | registered but never fires                               |
| `onMuteRequest(cb)` / `onUnmuteRequest(cb)` → unsubscribe fn | listen for`MUTE_COMMAND` / `UNMUTE_COMMAND`        | —                                 | registered but never fires                               |
| `onFocusLost(cb)` → unsubscribe fn                             | listens for`FOCUS_LOST_COMMAND`                      | —                                 | registered but never fires                               |
| `onImportSave(cb)` → unsubscribe fn                            | listens for`IMPORT_SAVE_COMMAND { saveData }`        | —                                 | registered but never fires                               |
| `DallinSdk.isEmbedded`                                          | `boolean`, `window.self !== window.top`            | —                                 | —                                                       |

`exportSave()` is a request the game can trigger, but the actual file download/upload UI lives on the portal page (outside the sandboxed iframe) — the portal fulfills the request. `importSave` is the mirror image: since the trigger (the player picking a file) happens on the portal page, it's a listener (`onImportSave`) rather than something the game calls directly — the portal pushes the imported data down once the player uploads it.

## The Universal Payload Schema

```json
{ "dallinSdk": true, "type": "ACTION_NAME", "payload": { "...": "..." }, "id": "req_...", "gameId": "my-game", "instanceId": "..." }
```

- `id` correlates a request with its response — the portal echoes the same `id` back, regardless of what `type` the reply uses.
- `gameId` is read once at startup from the game's own `public/game.config.json` (`./game.config.json` relative to `index.html`, always present in the build output), so no manual setup is required.
- `instanceId` is assigned by the portal during a registration handshake: on load, the SDK sends `SDK_INIT` with its `gameId`; the portal replies `SDK_REGISTERED { instanceId }`; the SDK includes that `instanceId` on every message after that. If the portal never responds (e.g. an older portal that doesn't implement this yet), the SDK logs a warning and continues operating without one rather than failing hard.

Requests reject after 8 seconds if the portal never replies. When the game isn't running inside a portal iframe at all (`isEmbedded === false`, e.g. plain `npm run dev`), no messages are sent and every method resolves instantly with the standalone fallback described above.
