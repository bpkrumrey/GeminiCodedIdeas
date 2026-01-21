
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
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          console.warn('Wake Lock disallowed by permissions policy or environment restriction.');
        } else {
          console.error(`Wake Lock Error: ${err.name}, ${err.message}`);
        }
        setIsLocked(false);
      }
    } else {
      console.warn('Wake Lock API not supported in this browser.');
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        if (wakeLockRef.current.released === false) {
          await wakeLockRef.current.release();
        }
        wakeLockRef.current = null;
        setIsLocked(false);
        console.log('Wake Lock released');
      } catch (err) {
        console.error('Error releasing Wake Lock:', err);
      }
    }
  }, []);

  // Re-acquire lock if visibility changes
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isLocked && !wakeLockRef.current) {
        // We attempt to re-request if it was locked before visibility was lost
        // Browser policies usually require a user gesture, but visibility change re-acquisition 
        // is sometimes permitted depending on the browser.
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isLocked, requestWakeLock, releaseWakeLock]);

  return { isLocked, requestWakeLock, releaseWakeLock };
};
