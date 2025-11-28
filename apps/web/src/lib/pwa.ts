/**
 * PWA utilities for FileFlow
 * Handles install prompts, update checks, and offline detection
 */

export interface PWAState {
  isInstalled: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
  swRegistration: ServiceWorkerRegistration | null;
}

let pwaState: PWAState = {
  isInstalled: false,
  isOnline: navigator.onLine,
  updateAvailable: false,
  swRegistration: null,
};

let listeners: Set<(state: PWAState) => void> = new Set();

/**
 * Subscribe to PWA state changes
 */
export function subscribeToPWAState(callback: (state: PWAState) => void): () => void {
  listeners.add(callback);
  // Immediately call with current state
  callback(pwaState);
  return () => listeners.delete(callback);
}

/**
 * Notify all listeners of state change
 */
function notifyListeners() {
  listeners.forEach((callback) => callback(pwaState));
}

/**
 * Get current PWA state
 */
export function getPWAState(): PWAState {
  return { ...pwaState };
}

/**
 * Initialize PWA features
 */
export function initPWA(): void {
  // Detect if running as PWA
  if (window.matchMedia('(display-mode: standalone)').matches) {
    pwaState.isInstalled = true;
  }
  if (document.referrer.includes('android-app://')) {
    pwaState.isInstalled = true;
  }

  // Monitor online/offline status
  window.addEventListener('online', () => {
    pwaState.isOnline = true;
    notifyListeners();
    console.log('[PWA] Online');
  });

  window.addEventListener('offline', () => {
    pwaState.isOnline = false;
    notifyListeners();
    console.log('[PWA] Offline');
  });

  // Listen for install prompt
  window.addEventListener('beforeinstallprompt', () => {
    console.log('[PWA] Install prompt available');
  });

  window.addEventListener('appinstalled', () => {
    pwaState.isInstalled = true;
    notifyListeners();
    console.log('[PWA] App installed');
  });
}

/**
 * Prompt user to install PWA
 */
export async function promptInstallPWA(): Promise<boolean> {
  const prompt = (window as any).fileflowInstallPrompt;
  if (!prompt) {
    console.warn('[PWA] Install prompt not available');
    return false;
  }

  prompt();
  return true;
}

/**
 * Check for service worker updates
 */
export async function checkForUpdates(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    await registration.update();
    if (registration.waiting) {
      pwaState.updateAvailable = true;
      notifyListeners();
      console.log('[PWA] Update available');
      return true;
    }
    return false;
  } catch (err) {
    console.error('[PWA] Update check failed:', err);
    return false;
  }
}

/**
 * Apply pending update (restart app with new service worker)
 */
export async function applyUpdate(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.waiting) {
      // Tell SW to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Listen for controllerchange to reload
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloaded) {
          reloaded = true;
          window.location.reload();
        }
      });
    }
  } catch (err) {
    console.error('[PWA] Update apply failed:', err);
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log('[PWA] All caches cleared');
  } catch (err) {
    console.error('[PWA] Cache clear failed:', err);
  }
}

/**
 * Get cached files count (estimate)
 */
export async function getCachedFilesCount(): Promise<number> {
  try {
    const cacheNames = await caches.keys();
    let count = 0;
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      count += keys.length;
    }
    return count;
  } catch (err) {
    console.error('[PWA] Cache count check failed:', err);
    return 0;
  }
}

/**
 * Check if browser supports PWA features
 */
export function hasPWASupport(): boolean {
  return (
    'serviceWorker' in navigator &&
    'caches' in window &&
    'indexedDB' in window &&
    'Promise' in window &&
    'fetch' in window
  );
}
