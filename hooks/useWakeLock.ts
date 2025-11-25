import { useEffect, useRef, useState, useCallback } from 'react';

export const useWakeLock = () => {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          setIsLocked(false);
        });
        setIsLocked(true);
        console.log('Wake Lock is active');
      } catch (err) {
        console.error(`${err instanceof Error ? err.name : 'Error'}, ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } else {
      console.warn('Wake Lock API not supported in this browser.');
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsLocked(false);
        console.log('Wake Lock released');
      } catch (err) {
        console.error(`${err instanceof Error ? err.name : 'Error'}, ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  }, []);

  // Re-acquire lock if visibility changes (e.g. user switches tabs and comes back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        // Optionally auto-request here if intended, but usually requires user gesture interaction first.
        // We will leave manual control to the start button to adhere to browser policies.
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return { isLocked, requestWakeLock, releaseWakeLock };
};