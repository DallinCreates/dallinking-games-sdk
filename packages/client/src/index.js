const TARGET_ORIGIN = '*';
const REQUEST_TIMEOUT_MS = 8000;
const REGISTRATION_TIMEOUT_MS = 5000;
const DEV_SAVE_KEY = 'dallinsdk:dev:save';

const isEmbedded = (() => {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch (e) {
    // Cross-origin access to window.top throws, which only happens when embedded.
    return true;
  }
})();

let gameId = null;
let instanceId = null;
let registrationPromise = null;

const pending = new Map();
const commandListeners = new Map();

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `req_${crypto.randomUUID()}`;
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function postToParent(type, payload, id) {
  window.parent.postMessage(
    { dallinSdk: true, type, payload: payload ?? null, id, gameId, instanceId },
    TARGET_ORIGIN
  );
}

function request(type, payload, { timeoutMs = REQUEST_TIMEOUT_MS, devFallback = () => null } = {}) {
  if (!isEmbedded) {
    return Promise.resolve(devFallback());
  }

  const id = generateId();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`[DallinSdk] Request "${type}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    pending.set(id, { resolve, reject, timer });
    postToParent(type, payload, id);
  });
}

function notify(type, payload, devLabel) {
  if (!isEmbedded) {
    if (devLabel) console.log(`[DallinSdk] dev mode: ${devLabel}`);
    return;
  }
  postToParent(type, payload ?? null, generateId());
}

function onCommand(type, callback) {
  if (typeof callback !== 'function') {
    return () => {};
  }
  if (!commandListeners.has(type)) {
    commandListeners.set(type, new Set());
  }
  commandListeners.get(type).add(callback);
  return () => {
    const listeners = commandListeners.get(type);
    if (listeners) listeners.delete(callback);
  };
}

function handleIncoming(event) {
  const data = event.data;
  if (!data || data.dallinSdk !== true) return;

  const { id, type, payload } = data;

  if (id && pending.has(id)) {
    const { resolve, timer } = pending.get(id);
    clearTimeout(timer);
    pending.delete(id);
    resolve(payload);
    return;
  }

  const listeners = commandListeners.get(type);
  if (listeners) {
    listeners.forEach((callback) => {
      try {
        callback(payload);
      } catch (err) {
        console.error(`[DallinSdk] onCommand listener for "${type}" threw:`, err);
      }
    });
  }
}

function loadGameId() {
  return fetch('./game.config.json')
    .then((res) => (res.ok ? res.json() : null))
    .then((config) => {
      gameId = config?.id ?? null;
      return gameId;
    })
    .catch(() => null);
}

function register() {
  if (registrationPromise) return registrationPromise;

  registrationPromise = loadGameId().then(() =>
    request('SDK_INIT', null, { timeoutMs: REGISTRATION_TIMEOUT_MS })
      .then((payload) => {
        instanceId = payload?.instanceId ?? null;
      })
      .catch((err) => {
        console.warn(
          '[DallinSdk] Registration with the portal did not complete; continuing without an instanceId.',
          err
        );
      })
  );

  return registrationPromise;
}

if (isEmbedded) {
  window.addEventListener('message', handleIncoming);
  register();
}

// ---- Dev-mode (standalone, not embedded in a portal iframe) fallbacks ----

function devGetSaveData() {
  try {
    return localStorage.getItem(DEV_SAVE_KEY);
  } catch (e) {
    return null;
  }
}

function devSetSaveData(data) {
  try {
    localStorage.setItem(DEV_SAVE_KEY, data);
  } catch (e) {
    // Storage unavailable (e.g. private browsing) - nothing sensible to do standalone.
  }
}

function devExportSave() {
  const data = devGetSaveData() ?? '';
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'save.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return { exported: true };
}

async function devTriggerShare(shareText) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text: shareText });
      return { shared: true };
    } catch (e) {
      return { shared: false };
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(shareText);
      console.info('[DallinSdk] dev mode: share text copied to clipboard.');
      return { shared: true };
    } catch (e) {
      return { shared: false };
    }
  }
  return { shared: false };
}

async function devRequestFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
    return { granted: !!document.fullscreenElement };
  } catch (e) {
    return { granted: false };
  }
}

// ---- Public API ----

export const DallinSdk = {
  get isEmbedded() {
    return isEmbedded;
  },

  getSaveData() {
    return request('LOAD_REQUEST', null, { devFallback: () => devGetSaveData() }).then((payload) =>
      isEmbedded ? payload?.saveData ?? null : payload
    );
  },

  saveData(data) {
    return request('SAVE_REQUEST', { saveData: data }, {
      devFallback: () => devSetSaveData(data),
    }).then(() => undefined);
  },

  getUser() {
    return request('USER_REQUEST', null, {
      devFallback: () => ({ isLoggedIn: false, username: null, userId: null }),
    });
  },

  getLanguage() {
    return request('LANGUAGE_REQUEST', null, {
      devFallback: () => (typeof navigator !== 'undefined' ? navigator.language : 'en-US'),
    }).then((payload) => (isEmbedded ? payload?.language ?? 'en-US' : payload));
  },

  showAd() {
    return request('AD_REQUEST', null, {
      devFallback: () => {
        console.info('[DallinSdk] dev mode: showAd() skipped.');
        return { watched: true };
      },
    });
  },

  openLink(url) {
    return request('OPEN_LINK_REQUEST', { url }, {
      devFallback: () => {
        window.open(url, '_blank', 'noopener,noreferrer');
        return { opened: true };
      },
    });
  },

  requestFullscreen() {
    return request('FULLSCREEN_REQUEST', null, { devFallback: () => devRequestFullscreen() });
  },

  requestTheaterMode() {
    return request('THEATER_MODE_REQUEST', null, { devFallback: () => ({ granted: false }) });
  },

  exportSave() {
    return request('EXPORT_SAVE_REQUEST', null, { devFallback: () => devExportSave() });
  },

  triggerShare(shareText) {
    return request('SHARE_REQUEST', { shareText }, {
      devFallback: () => devTriggerShare(shareText),
    });
  },

  updateProgress(percentage) {
    notify('PROGRESS_UPDATE', { percentComplete: percentage }, `updateProgress(${percentage})`);
  },

  gameReady() {
    notify('GAME_READY', null, 'gameReady()');
  },

  fatalError(message) {
    if (!isEmbedded) {
      console.error('[DallinSdk] dev mode: fatalError() called:', message);
      return;
    }
    postToParent('FATAL_ERROR', { message }, generateId());
  },

  onPauseRequest(callback) {
    return onCommand('PAUSE_COMMAND', callback);
  },

  onMuteRequest(callback) {
    return onCommand('MUTE_COMMAND', callback);
  },

  onUnmuteRequest(callback) {
    return onCommand('UNMUTE_COMMAND', callback);
  },

  onFocusLost(callback) {
    return onCommand('FOCUS_LOST_COMMAND', callback);
  },

  onImportSave(callback) {
    return onCommand('IMPORT_SAVE_COMMAND', (payload) => {
      if (typeof callback === 'function') callback(payload?.saveData ?? null);
    });
  },
};

export default DallinSdk;
