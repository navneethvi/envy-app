import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { formatMoney, formatMoneyCompact } from './analytics';

const STORAGE_KEY = 'envy:hideMoney';

// What every rupee amount reads as while incognito is on.
export const MASK = '₹••••';

// Same defensive AsyncStorage load as lib/theme: fall back to in-memory if the
// native module isn't linked.
let storage = null;
try {
  storage = require('@react-native-async-storage/async-storage').default;
} catch {
  storage = null;
}

const PrivacyContext = createContext(null);

// Incognito mode: hides every amount in the app so the screen is safe to show around.
export function PrivacyProvider({ children }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const v = storage ? await storage.getItem(STORAGE_KEY) : null;
        if (active && v === '1') setHidden(true);
      } catch { /* keep the default */ }
    })();
    return () => { active = false; };
  }, []);

  const toggle = useCallback(() => {
    setHidden(prev => {
      const next = !prev;
      try { storage?.setItem(STORAGE_KEY, next ? '1' : '0')?.catch?.(() => {}); } catch { /* in-memory only */ }
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    hidden,
    toggle,
    money: hidden ? () => MASK : formatMoney,
    moneyCompact: hidden ? () => MASK : formatMoneyCompact,
  }), [hidden, toggle]);

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

// { hidden, toggle, money(amount), moneyCompact(amount) } — use these instead of
// formatMoney directly so amounts respect incognito mode.
export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error('usePrivacy must be used within a PrivacyProvider');
  return ctx;
}
