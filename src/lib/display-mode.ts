import { useEffect, useLayoutEffect, useState } from 'react';
import { databaseName } from './storage';

export type DisplayMode = 'light' | 'dark' | 'system';
const preferenceKey = databaseName() + ':display-mode';
function readPreference(): DisplayMode {
 try {
  const value = localStorage.getItem(preferenceKey);
  return value === 'light' || value === 'dark' ? value : 'system';
 } catch { return 'system'; }
}
function systemIsDark() { return window.matchMedia('(prefers-color-scheme: dark)').matches; }
function apply(mode: DisplayMode, dark: boolean) {
 const resolved = mode === 'system' ? (dark ? 'dark' : 'light') : mode;
 document.documentElement.dataset.theme = resolved;
 document.documentElement.classList.toggle('dark', resolved === 'dark');
 return resolved;
}
// Apply the saved preference before React renders, including loading and error screens.
export function initializeDisplayMode() { apply(readPreference(), systemIsDark()); }
export function useDisplayMode() {
 const [mode, setMode] = useState<DisplayMode>(readPreference);
 const [systemDark, setSystemDark] = useState(systemIsDark);
 const [saveFailed, setSaveFailed] = useState(false);
 const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
 useLayoutEffect(() => { apply(mode, systemDark); }, [mode, systemDark]);
 useEffect(() => {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const changed = () => setSystemDark(media.matches);
  const storageChanged = (event: StorageEvent) => {
   if (event.key === preferenceKey || event.key === null) {
    setMode(readPreference()); setSaveFailed(false);
   }
  };
  media.addEventListener('change', changed);
  window.addEventListener('storage', storageChanged);
  changed();
  return () => { media.removeEventListener('change', changed); window.removeEventListener('storage', storageChanged); };
 }, []);
 function choose(next: DisplayMode) {
  setMode(next);
  try { localStorage.setItem(preferenceKey, next); setSaveFailed(false); }
  catch { setSaveFailed(true); }
 }
 return { mode, resolved, choose, saveFailed };
}
