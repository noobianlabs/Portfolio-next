import { useSyncExternalStore } from 'react';
import { isMobileDevice } from './util';

function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

function getServerSnapshot() {
  return false;
}

export function useSmallWindow() {
  return useSyncExternalStore(subscribe, isMobileDevice, getServerSnapshot);
}
