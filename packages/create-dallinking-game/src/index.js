import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

function toTitleCase(name) {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function scaffoldProject(projectDir) {
  const targetDir = path.resolve(projectDir);
  const projectName = path.basename(targetDir);
  const slug = toSlug(projectName);
  const title = toTitleCase(projectName);

  console.log(`\n🚀 Scaffolding a new game: "${title}" inside "${targetDir}"...`);

  const writeFile = (relativeFilePath, content) => {
    const fullPath = path.join(targetDir, relativeFilePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  };

  // 1. package.json
  const packageJsonContent = `{
  "name": "${projectName}",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:zip": "node scripts/build-zip.js",
    "build:all": "npm run build && npm run build:zip",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "@dallincreates/game-client": "latest"
  },
  "devDependencies": {
    "vite": "^8.0.10",
    "@vitejs/plugin-react": "^6.0.1",
    "adm-zip": "^0.5.10"
  }
}`;

  // 2. public/game.config.json
  const gameConfigContent = `{
  "id": "${slug}",
  "name": "${title}",
  "version": "1.0.0",
  "shortDescription": "",
  "longDescription": "",
  "seoDescription": "",
  "tags": [],
  "difficultyToLearn": "Easy",
  "averageDurationMinutes": 10,
  "orientation": "responsive",
  "supportsSaveData": true,
  "minSdkVersion": "1.0.0",
  "assets": {
    "thumbnail": "./assets/thumbnail.png",
    "cover": "./assets/cover.png"
  },
  "author": "Dallin King"
}`;

  // 3. vite.config.js
  const viteConfigContent = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
});`;

  // 4. .gitignore
  const gitignoreContent = `node_modules/
dist/
*.zip
.env
.DS_Store
`;

  // 5. scripts/build-zip.js
  const buildZipContent = `import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

const distPath = path.resolve('./dist');
const configPath = path.resolve('./public/game.config.json');

if (!fs.existsSync(distPath)) {
  console.error('Error: dist folder does not exist. Run "npm run build" first.');
  process.exit(1);
}

let zipName = null;

if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.id) zipName = \`\${config.id}.zip\`;
  } catch (err) {
    // Fall through to the package.json fallback below.
  }
}

if (!zipName) {
  const pkg = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf8'));
  zipName = \`\${pkg.name}.zip\`;
}

const zip = new AdmZip();
zip.addLocalFolder(distPath);
zip.writeZip(zipName);

console.log(\`✅ Successfully created \${zipName} with the contents of the dist folder.\`);
`;

  // 6. index.html
  const indexHtmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

  // 7. src/main.jsx
  const mainJsxContent = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);`;

  // 8. src/index.css
  const indexCssContent = `:root {
  color-scheme: light dark;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}

#root {
  min-height: 100vh;
}

.loading-screen,
.fatal-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}

.game {
  padding: 2rem;
  text-align: center;
}`;

  // 9. src/ErrorBoundary.jsx
  const errorBoundaryContent = `import { Component } from 'react';
import { DallinSdk } from '@dallincreates/game-client';

/**
 * Reports uncaught render errors to the portal via DallinSdk.fatalError() so it
 * can hide the iframe and offer the player a "Refresh Game" button, instead of
 * leaving them looking at a blank/broken screen.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    DallinSdk.fatalError(error?.message ?? 'Unknown error');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fatal-error">
          <p>Something went wrong.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;`;

  // 10. src/App.jsx (DEMO WIRING FOR EVERY CORE DallinSdk TOUCHPOINT)
  const appJsxContent = `import { useEffect, useState } from 'react';
import { DallinSdk } from '@dallincreates/game-client';
import ErrorBoundary from './ErrorBoundary.jsx';

function Game() {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState('en-US');

  // Simulate asset loading, restore any existing save, then tell the portal
  // we've reached the main menu so it can fade out its loading overlay.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (let pct = 0; pct <= 100; pct += 20) {
        if (cancelled) return;
        DallinSdk.updateProgress(pct);
        setProgress(pct);
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      const [savedData, currentUser, currentLanguage] = await Promise.all([
        DallinSdk.getSaveData().catch(() => null),
        DallinSdk.getUser().catch(() => null),
        DallinSdk.getLanguage().catch(() => 'en-US'),
      ]);

      if (cancelled) return;

      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (typeof parsed.score === 'number') setScore(parsed.score);
        } catch (err) {
          console.warn('Could not parse saved data:', err);
        }
      }

      setUser(currentUser);
      setLanguage(currentLanguage);
      setReady(true);
      DallinSdk.gameReady();
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // React to portal-driven pause/mute/focus commands.
  useEffect(() => {
    const unsubscribePause = DallinSdk.onPauseRequest(() => setPaused(true));
    const unsubscribeMute = DallinSdk.onMuteRequest(() => setMuted(true));
    const unsubscribeUnmute = DallinSdk.onUnmuteRequest(() => setMuted(false));
    const unsubscribeFocusLost = DallinSdk.onFocusLost(() => setPaused(true));

    return () => {
      unsubscribePause();
      unsubscribeMute();
      unsubscribeUnmute();
      unsubscribeFocusLost();
    };
  }, []);

  const handleSave = () => {
    DallinSdk.saveData(JSON.stringify({ score })).catch((err) => {
      console.error('Failed to save progress:', err);
    });
  };

  if (!ready) {
    return (
      <div className="loading-screen">
        <p>Loading... {progress}%</p>
      </div>
    );
  }

  return (
    <div className="game">
      <h1>${title}</h1>
      <p>Score: {score}</p>
      <p>{user?.isLoggedIn ? \`Playing as \${user.username}\` : 'Progress is saved locally on this device.'}</p>
      <p>Language: {language}</p>
      {muted && <p>Muted</p>}

      {paused ? (
        <button onClick={() => setPaused(false)}>Resume</button>
      ) : (
        <>
          <button onClick={() => setScore((s) => s + 1)}>Add point</button>
          <button onClick={handleSave}>Save progress</button>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Game />
    </ErrorBoundary>
  );
}`;

  // 11. README.md (AI / DEVELOPER GUIDE)
  const readmeContent = `# ${title}

Single-player game for [games.dallinking.com](https://games.dallinking.com), scaffolded with \`create-dallinking-game\`.

## 🤖 AI / Developer Guide

If you are an AI assisting with this codebase, you must understand how this game talks to the portal via \`@dallincreates/game-client\`'s \`DallinSdk\`.

### The Universal Payload Schema

Every message between this game and the portal uses the same envelope: \`{ dallinSdk: true, type, payload, id, gameId, instanceId }\`. You never construct these messages by hand — \`DallinSdk\` methods do it for you.

### DallinSdk API

| Method | Purpose |
|---|---|
| \`getSaveData()\` / \`saveData(data)\` | Load/persist the player's save (a string, usually JSON) |
| \`getUser()\` | \`{isLoggedIn, username, userId}\` — warn the player if progress is local-only when logged out |
| \`getLanguage()\` | The player's preferred language, for localization |
| \`showAd()\` | Ask the portal to show an interstitial ad between levels |
| \`openLink(url)\` | Safely open an external link (never use \`window.open\` directly — the portal sandbox blocks it) |
| \`requestFullscreen()\` / \`requestTheaterMode()\` | Ask the portal to expand the game view |
| \`exportSave()\` | Ask the portal to let the player download their save file |
| \`triggerShare(shareText)\` | Ask the portal to open the native/web share flow |
| \`updateProgress(percentage)\` | Report asset-loading progress (0-100) during startup |
| \`gameReady()\` | Call once you reach the main menu — the portal fades out its loading overlay |
| \`fatalError(message)\` | Report an unrecoverable error so the portal can offer a "Refresh Game" button |
| \`onPauseRequest(cb)\` / \`onFocusLost(cb)\` | The portal is telling you to pause gameplay/audio |
| \`onMuteRequest(cb)\` / \`onUnmuteRequest(cb)\` | The portal is telling you to mute/unmute all audio |
| \`onImportSave(cb)\` | The portal is pushing down save data the player uploaded on the portal page |
| \`DallinSdk.isEmbedded\` | \`false\` when running standalone (e.g. \`npm run dev\`) — every method above still works, using local dev-mode fallbacks (localStorage, real Fullscreen API, clipboard, etc.) instead of talking to a portal |

See \`src/App.jsx\` for a working example wiring most of these, and \`node_modules/@dallincreates/game-client/README.md\` for the full request/response and fallback behavior of every method.

### \`public/game.config.json\`

Read by the portal to show this game's discovery/SEO page before the player presses Play. Fill in \`shortDescription\`, \`longDescription\`, \`seoDescription\`, \`tags\`, \`difficultyToLearn\`, \`averageDurationMinutes\`, and \`assets.thumbnail\`/\`assets.cover\` (paths relative to \`public/\`) as the game takes shape. \`id\` must stay unique and stable — it's how the portal (and this project's own \`localStorage\` dev-mode save key) identifies the game.

## Getting started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Building

\`\`\`bash
npm run build:all
\`\`\`

Builds the game and produces \`${slug}.zip\` at the project root, ready to upload to the games.dallinking.com developer dashboard.
`;

  // Write all files!
  writeFile('package.json', packageJsonContent);
  writeFile('public/game.config.json', gameConfigContent);
  writeFile('vite.config.js', viteConfigContent);
  writeFile('.gitignore', gitignoreContent);
  writeFile('scripts/build-zip.js', buildZipContent);
  writeFile('index.html', indexHtmlContent);
  writeFile('src/main.jsx', mainJsxContent);
  writeFile('src/index.css', indexCssContent);
  writeFile('src/ErrorBoundary.jsx', errorBoundaryContent);
  writeFile('src/App.jsx', appJsxContent);
  writeFile('README.md', readmeContent);

  console.log(`\n🎉 Success! Scaffolded game project at: "${targetDir}"`);

  try {
    console.log('\n📦 Initializing Git repository...');
    execSync('git init', { cwd: targetDir, stdio: 'ignore' });
    execSync('git add .', { cwd: targetDir, stdio: 'ignore' });
    execSync('git commit -m "Initial commit: Scaffolded game project"', { cwd: targetDir, stdio: 'ignore' });
    console.log('✅ Git repository initialized and first commit created.');
  } catch (err) {
    console.warn('⚠️ Could not initialize Git repository automatically. Make sure Git is installed on your system.');
  }

  console.log(`\nTo get started:\n  cd ${projectName}\n  npm install\n  npm run dev\n`);
}

export default {
  scaffoldProject,
};
