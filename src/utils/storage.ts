/**
 * Safe LocalStorage wrapper to prevent crash in privacy mode, restricted iframes, or desktop browser security policies
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`safeLocalStorage.getItem failed for key "${key}":`, e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`safeLocalStorage.setItem failed for key "${key}":`, e);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`safeLocalStorage.removeItem failed for key "${key}":`, e);
    }
  }
};
