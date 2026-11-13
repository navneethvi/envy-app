import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { API_BASE_URL } from '../constants/api';
import { api, isPasscodeError, loadPasscode, setLockedHandler, setPasscode } from './api';
import { decorate } from './analytics';

const BookingsContext = createContext(null);

// One place that owns the BMS data: the booking list, the Gmail connection and the scrape.
export function BookingsProvider({ children }) {
  const [raw, setRaw] = useState([]);
  const [gmail, setGmail] = useState(null);        // { connected, email, connectedAt, lastSyncAt }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState(null);      // { ok, text }
  const [locked, setLocked] = useState(false);     // backend wants a passcode we don't have
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [list, status] = await Promise.all([
        api.get('/'),
        api.get('/gmail/status').catch(() => ({ data: { connected: false } })),
      ]);
      setRaw(list.data.data);
      setGmail(status.data);
      setError(null);
      setLocked(false);
      return status.data;
    } catch (err) {
      if (isPasscodeError(err)) return null;   // the lock screen takes over
      setError(`Can't reach the backend at ${API_BASE_URL}. Start it with "npm run dev" in backend/.`);
      return null;
    }
  }, []);

  useEffect(() => {
    setLockedHandler(() => setLocked(true));
    loadPasscode().then(load).finally(() => setLoading(false));
    return () => { clearInterval(pollRef.current); setLockedHandler(null); };
  }, [load]);

  // Try a passcode from the lock screen. Resolves to an error message, or null on success.
  const unlock = useCallback(async (code) => {
    await setPasscode(code.trim());
    try {
      await api.get('/gmail/status');
    } catch (err) {
      if (isPasscodeError(err)) return 'Wrong passcode.';
      if (err?.response?.status === 429) return err.response.data?.error || 'Too many attempts. Try again later.';
      return "Can't reach the backend. Try again in a moment.";
    }
    setLocked(false);
    setLoading(true);
    load().finally(() => setLoading(false));
    return null;
  }, [load]);

  const sync = useCallback(async ({ full = false } = {}) => {
    setSyncing(true);
    setNotice(null);
    try {
      const { data } = await api.post('/scrape', null, { params: full ? { full: true } : {} });
      await load();
      const bits = [];
      if (data.inserted) bits.push(`${data.inserted} new ${data.inserted === 1 ? 'booking' : 'bookings'}`);
      if (data.updated) bits.push(`${data.updated} refreshed`);
      if (data.cancelledBookings) bits.push(`${data.cancelledBookings} marked refunded`);
      setNotice({
        ok: true,
        text: bits.length
          ? `${bits.join(' · ')} — checked ${data.emails} BookMyShow emails.`
          : `You're up to date — checked ${data.emails} BookMyShow emails, nothing new.`,
      });
    } catch (err) {
      const reauth = err?.response?.data?.code === 'reauth';
      if (reauth) setGmail(g => ({ ...(g || {}), connected: false, expired: true }));
      setNotice({ ok: false, text: err?.response?.data?.error || 'Sync failed — is the backend running?' });
    } finally {
      setSyncing(false);
    }
  }, [load]);

  // Open Google's consent page, then watch for the connection and run the first scrape.
  const connect = useCallback(async () => {
    try {
      const { data } = await api.get('/auth-url');
      await Linking.openURL(data.url);
      setNotice({ ok: true, text: 'Finish the Google sign-in in your browser — syncing starts automatically.' });
      clearInterval(pollRef.current);
      let tries = 0;
      pollRef.current = setInterval(async () => {
        tries += 1;
        const { data: st } = await api.get('/gmail/status').catch(() => ({ data: null }));
        if (st?.connected) {
          clearInterval(pollRef.current);
          setGmail(st);
          sync();
        } else if (tries > 60) {
          clearInterval(pollRef.current);
        }
      }, 3000);
    } catch (err) {
      setNotice({ ok: false, text: err?.response?.data?.error || 'Could not start the Gmail sign-in.' });
    }
  }, [sync]);

  const disconnect = useCallback(async () => {
    try {
      await api.delete('/gmail');
      setGmail({ connected: false });
      setNotice({ ok: true, text: 'Gmail disconnected. Your saved bookings are still here.' });
    } catch {
      setNotice({ ok: false, text: 'Could not disconnect Gmail.' });
    }
  }, []);

  const items = useMemo(() => decorate(raw), [raw]);           // every booking, newest first
  const visits = useMemo(() => items.filter(v => !v.cancelled), [items]); // refunds excluded

  const value = {
    items, visits, gmail, loading, error, syncing, notice, locked, unlock,
    reload: load, sync, connect, disconnect, clearNotice: () => setNotice(null),
  };
  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
}

export function useBookings() {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error('useBookings must be used within a BookingsProvider');
  return ctx;
}
