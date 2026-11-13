import { createContext, useContext, useEffect, useState } from 'react';
import { THEMES, THEME_MAP, DEFAULT_THEME_KEY } from '../constants/themes';

const STORAGE_KEY = 'envy:themeKey';

// Load AsyncStorage defensively. If the native module isn't linked yet (e.g.
// the app hasn't been rebuilt since the dependency was added), importing or
// calling it can throw — we fall back to in-memory so the app never crashes.
// Persistence resumes automatically once a build includes the native module.
let storage = null;
try {
  storage = require('@react-native-async-storage/async-storage').default;
} catch {
  storage = null;
}

async function loadKey() {
  try {
    if (!storage) return null;
    return await storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

async function saveKey(key) {
  try {
    if (storage) await storage.setItem(STORAGE_KEY, key);
  } catch {
    /* persistence unavailable — keep going in-memory */
  }
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKeyState] = useState(DEFAULT_THEME_KEY);

  // Load the saved choice once on mount.
  useEffect(() => {
    let active = true;
    loadKey().then(v => { if (active && v && THEME_MAP[v]) setThemeKeyState(v); });
    return () => { active = false; };
  }, []);

  const setThemeKey = (key) => {
    if (!THEME_MAP[key]) return;
    setThemeKeyState(key);
    saveKey(key);
  };

  const theme = THEME_MAP[themeKey] || THEME_MAP[DEFAULT_THEME_KEY];

  return (
    <ThemeContext.Provider value={{ theme, themeKey, setThemeKey, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
