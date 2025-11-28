/**
 * Component to display PWA install prompt and update notifications
 */

import { useEffect, useState } from 'react';
import { getPWAState, subscribeToPWAState, promptInstallPWA, checkForUpdates, applyUpdate } from '../lib/pwa';
import type { PWAState } from '../lib/pwa';

export default function PWANotifications() {
  const [pwaState, setPWAState] = useState<PWAState>(() => getPWAState());
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToPWAState((state) => {
      setPWAState(state);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Check for updates periodically
    const interval = setInterval(() => {
      checkForUpdates();
    }, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // Show update notification when update is available
  useEffect(() => {
    if (pwaState.updateAvailable) {
      setShowUpdatePrompt(true);
    }
  }, [pwaState.updateAvailable]);

  if (!showInstallPrompt && !showUpdatePrompt) {
    return null;
  }

  return (
    <>
      {/* Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 bg-blue-600 border border-blue-500 rounded-lg shadow-lg p-4 max-w-sm z-40">
          <h3 className="font-semibold text-white mb-2">Install FileFlow</h3>
          <p className="text-sm text-blue-100 mb-3">
            Install FileFlow on your device for quick access and offline support.
          </p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                await promptInstallPWA();
                setShowInstallPrompt(false);
              }}
              className="px-3 py-1.5 text-sm rounded bg-white text-blue-600 font-medium hover:bg-blue-50"
            >
              Install
            </button>
            <button
              onClick={() => setShowInstallPrompt(false)}
              className="px-3 py-1.5 text-sm rounded border border-blue-400 text-blue-100 hover:bg-blue-500/30"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Update Available Prompt */}
      {showUpdatePrompt && (
        <div className="fixed bottom-4 left-4 bg-amber-600 border border-amber-500 rounded-lg shadow-lg p-4 max-w-sm z-40">
          <h3 className="font-semibold text-white mb-2">Update Available</h3>
          <p className="text-sm text-amber-100 mb-3">
            A new version of FileFlow is ready. Restart to apply the update.
          </p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                await applyUpdate();
              }}
              className="px-3 py-1.5 text-sm rounded bg-white text-amber-600 font-medium hover:bg-amber-50"
            >
              Restart Now
            </button>
            <button
              onClick={() => setShowUpdatePrompt(false)}
              className="px-3 py-1.5 text-sm rounded border border-amber-400 text-amber-100 hover:bg-amber-500/30"
            >
              Later
            </button>
          </div>
        </div>
      )}
    </>
  );
}

